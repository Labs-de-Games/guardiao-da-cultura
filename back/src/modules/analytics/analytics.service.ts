import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { In, MoreThanOrEqual } from "typeorm";
import type { GameEventPayload } from "../../shared/events/game-events";
import { GameEventType } from "../../shared/events/game-events";
import type { DashboardMetricsDto } from "../dashboard/dto/dashboard-metrics.dto";
import { DateRange } from "../dashboard/dto/dashboard-query.dto";
import { GameEvent } from "./game-event.entity";

const CRITICAL_LEVELS = new Set(["fatal", "critical", "error"]);
const OBJECT_INTERACTION_EVENTS = new Set([
  "object.inspected",
  "object_inspected",
  "object-inspected",
]);

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(GameEvent)
    private readonly eventRepository: Repository<GameEvent>,
  ) {}

  @OnEvent("game.event")
  async handleGameEvent(payload: GameEventPayload): Promise<void> {
    const event = this.eventRepository.create({
      userId: payload.userId,
      type: payload.type,
      metadata: payload.metadata ?? {},
      timestamp: payload.timestamp,
    });

    await this.eventRepository.save(event);
  }

  async getDashboardMetrics(
    dateRange: DateRange = DateRange.LAST_30_DAYS,
  ): Promise<DashboardMetricsDto> {
    const startDate = this.resolveStartDate(dateRange);
    const eventTypes = [
      GameEventType.GAME_STARTED,
      GameEventType.SESSION_END,
      GameEventType.LEVEL_STARTED,
      GameEventType.LEVEL_COMPLETED,
      GameEventType.QUIZ_COMPLETED,
      GameEventType.QUIZ_FAILED,
      GameEventType.BADGE_EARNED,
      GameEventType.EVENT_LOGGED,
    ];

    const events = await this.eventRepository.find({
      where: startDate
        ? {
            timestamp: MoreThanOrEqual(startDate),
            type: In(eventTypes),
          }
        : { type: In(eventTypes) },
      order: { timestamp: "ASC" },
    });

    const eventsByUser = new Map<string, GameEvent[]>();
    const totalUsers = new Set<string>();
    const usersWithGameStart = new Set<string>();
    const usersWithChapter1Start = new Set<string>();
    const usersWithChapter1Completion = new Set<string>();
    const badgeEarners = new Map<string, Set<string>>();
    const objectInspectors = new Set<string>();

    let quizSuccessCount = 0;
    let quizFailureCount = 0;
    let totalStars = 0;
    let starsCount = 0;

    for (const event of events) {
      if (!event.userId) {
        continue;
      }

      totalUsers.add(event.userId);

      if (!eventsByUser.has(event.userId)) {
        eventsByUser.set(event.userId, []);
      }
      eventsByUser.get(event.userId)?.push(event);

      switch (event.type) {
        case GameEventType.GAME_STARTED:
          usersWithGameStart.add(event.userId);
          break;
        case GameEventType.LEVEL_STARTED:
          if (this.isChapter1Event(event)) {
            usersWithChapter1Start.add(event.userId);
          }
          break;
        case GameEventType.LEVEL_COMPLETED:
          if (this.isChapter1Event(event)) {
            usersWithChapter1Completion.add(event.userId);
          }
          this.registerStars(event, (value) => {
            totalStars += value;
            starsCount += 1;
          });
          break;
        case GameEventType.QUIZ_COMPLETED:
          if (this.isQuizPassed(event)) {
            quizSuccessCount += 1;
          } else {
            quizFailureCount += 1;
          }
          break;
        case GameEventType.QUIZ_FAILED:
          quizFailureCount += 1;
          break;
        case GameEventType.BADGE_EARNED:
          this.registerBadge(event, badgeEarners);
          break;
        case GameEventType.EVENT_LOGGED:
          if (this.isObjectInteraction(event)) {
            objectInspectors.add(event.userId);
          }
          break;
        default:
          break;
      }
    }

    const totalPlayers = totalUsers.size;
    const loginCompletionRate = this.safeRate(
      usersWithGameStart.size,
      totalPlayers,
    );
    const chapter1StartRate = this.safeRate(
      usersWithChapter1Start.size,
      usersWithGameStart.size,
    );
    const chapter1CompletionRate = this.safeRate(
      usersWithChapter1Completion.size,
      usersWithChapter1Start.size,
    );

    const { averageSessionTime, errorFreeSessionRate } =
      this.calculateSessions(eventsByUser);

    const quizSuccessRate = this.safeRate(
      quizSuccessCount,
      quizSuccessCount + quizFailureCount,
    );

    const averageStarScore = starsCount > 0 ? totalStars / starsCount : 0;
    const objectInteractionRate = this.safeRate(
      objectInspectors.size,
      totalPlayers,
    );

    return {
      funnel: {
        loginCompletionRate,
        chapter1StartRate,
        chapter1CompletionRate,
      },
      engagement: {
        averageSessionTime,
        totalPlayers,
      },
      pedagogical: {
        quizSuccessRate,
        averageStarScore,
        objectInteractionRate,
      },
      badges: {
        explorerRate: this.badgeRate(badgeEarners, "explorer", totalPlayers),
        restauradorRate: this.badgeRate(
          badgeEarners,
          "restaurador",
          totalPlayers,
        ),
        curadorRate: this.badgeRate(badgeEarners, "curador", totalPlayers),
        detetiveRate: this.badgeRate(badgeEarners, "detetive", totalPlayers),
        persistenteRate: this.badgeRate(
          badgeEarners,
          "persistente",
          totalPlayers,
        ),
      },
      technical: {
        errorFreeSessionRate,
      },
    };
  }

  private resolveStartDate(dateRange: DateRange): Date | null {
    const now = new Date();
    switch (dateRange) {
      case DateRange.LAST_7_DAYS:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case DateRange.LAST_30_DAYS:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }

  private safeRate(numerator: number, denominator: number): number {
    if (denominator <= 0) {
      return 0;
    }
    return numerator / denominator;
  }

  private extractNumericMetadata(
    metadata: Record<string, unknown>,
    keys: string[],
  ): number | null {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string") {
        const direct = Number.parseInt(value, 10);
        if (!Number.isNaN(direct)) {
          return direct;
        }
        const match = value.match(/(\d+)/);
        if (match) {
          const parsed = Number.parseInt(match[1], 10);
          if (!Number.isNaN(parsed)) {
            return parsed;
          }
        }
      }
    }
    return null;
  }

  private extractStringMetadata(
    metadata: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
    return null;
  }

  private extractChapterNumber(
    metadata: Record<string, unknown>,
  ): number | null {
    return this.extractNumericMetadata(metadata, [
      "chapterNumber",
      "chapter",
      "chapterIndex",
      "phaseNumber",
      "phase",
      "stageNumber",
      "stage",
      "floorNumber",
      "floor",
      "levelNumber",
      "level",
      "levelIndex",
    ]);
  }

  private matchesChapterOne(value: string): boolean {
    const normalized = value.toLowerCase().replace(/\s+/g, "");
    if (
      [
        "1",
        "chapter-1",
        "chapter1",
        "capitulo-1",
        "capitulo1",
        "fase-1",
        "fase1",
        "stage-1",
        "stage1",
        "floor-1",
        "floor1",
        "level-1",
        "level1",
      ].includes(normalized)
    ) {
      return true;
    }

    const match = value.match(
      /(?:cap[ií]tulo|chapter|fase|stage|floor|level)\s*0*([0-9]+)/i,
    );
    return match ? match[1] === "1" : false;
  }

  private isChapter1Event(event: GameEvent): boolean {
    const metadata = event.metadata ?? {};
    const chapterNumber = this.extractChapterNumber(metadata);
    if (chapterNumber !== null) {
      return chapterNumber === 1;
    }

    const levelId = this.extractStringMetadata(metadata, [
      "levelId",
      "level_id",
      "level",
    ]);
    if (levelId && this.matchesChapterOne(levelId)) {
      return true;
    }

    const levelName = this.extractStringMetadata(metadata, [
      "levelName",
      "chapterName",
      "phaseName",
      "stageName",
      "floorName",
      "missionId",
    ]);

    return levelName ? this.matchesChapterOne(levelName) : false;
  }

  private isQuizPassed(event: GameEvent): boolean {
    const metadata = event.metadata ?? {};
    if (typeof metadata.passed === "boolean") {
      return metadata.passed;
    }
    return true;
  }

  private registerStars(event: GameEvent, onStar: (value: number) => void) {
    const metadata = event.metadata ?? {};
    const stars = Number(metadata.stars ?? metadata.score);
    if (Number.isFinite(stars)) {
      onStar(stars);
    }
  }

  private registerBadge(
    event: GameEvent,
    badgeEarners: Map<string, Set<string>>,
  ) {
    if (!event.userId) {
      return;
    }
    const metadata = event.metadata ?? {};
    const badgeValue = this.normalizeBadgeValue(
      typeof metadata.badgeId === "string"
        ? metadata.badgeId
        : typeof metadata.badgeName === "string"
          ? metadata.badgeName
          : "",
    );

    const badgeKey = this.matchBadgeKey(badgeValue);
    if (!badgeKey) {
      return;
    }

    if (!badgeEarners.has(badgeKey)) {
      badgeEarners.set(badgeKey, new Set<string>());
    }
    badgeEarners.get(badgeKey)?.add(event.userId);
  }

  private normalizeBadgeValue(value: string): string {
    return value.toLowerCase().replace(/[\s_-]+/g, "");
  }

  private matchBadgeKey(value: string): string | null {
    if (!value) {
      return null;
    }
    if (value.includes("explorador") || value.includes("explorer")) {
      return "explorer";
    }
    if (value.includes("restaurador")) {
      return "restaurador";
    }
    if (value.includes("curador")) {
      return "curador";
    }
    if (value.includes("detetive")) {
      return "detetive";
    }
    if (value.includes("persistente")) {
      return "persistente";
    }
    return null;
  }

  private badgeRate(
    badgeEarners: Map<string, Set<string>>,
    badgeKey: string,
    totalPlayers: number,
  ): number {
    const earners = badgeEarners.get(badgeKey)?.size ?? 0;
    return this.safeRate(earners, totalPlayers);
  }

  private isObjectInteraction(event: GameEvent): boolean {
    const metadata = event.metadata ?? {};
    if (metadata.inspectable === true || metadata.isInspectable === true) {
      return true;
    }

    const objectType = this.extractStringMetadata(metadata, [
      "objectType",
      "itemType",
    ]);
    if (objectType?.toLowerCase().includes("inspect")) {
      return true;
    }

    const eventName = this.extractStringMetadata(metadata, [
      "eventName",
      "event",
      "type",
      "name",
      "action",
    ]);
    if (eventName) {
      const normalized = eventName.toLowerCase();
      if (OBJECT_INTERACTION_EVENTS.has(normalized)) {
        return true;
      }
      if (normalized.includes("inspect") && normalized.includes("object")) {
        return true;
      }
    }

    const category = this.extractStringMetadata(metadata, [
      "category",
      "eventCategory",
      "group",
    ]);
    return category ? category.toLowerCase().includes("inspect") : false;
  }

  private isCriticalError(event: GameEvent): boolean {
    const metadata = event.metadata ?? {};
    if (metadata.isCritical === true || metadata.critical === true) {
      return true;
    }

    const level = this.extractStringMetadata(metadata, [
      "level",
      "severity",
      "type",
      "errorLevel",
      "errorType",
    ]);
    if (level && CRITICAL_LEVELS.has(level.toLowerCase())) {
      return true;
    }

    const statusCode = this.extractNumericMetadata(metadata, [
      "status",
      "statusCode",
      "code",
      "errorCode",
    ]);
    if (statusCode !== null && statusCode >= 500) {
      return true;
    }

    const message = this.extractStringMetadata(metadata, [
      "message",
      "error",
      "errorMessage",
    ]);
    return message ? /(fatal|critical)/i.test(message) : false;
  }

  private calculateSessions(eventsByUser: Map<string, GameEvent[]>) {
    let totalSessions = 0;
    let errorFreeSessions = 0;
    const sessionDurations: number[] = [];

    for (const userEvents of eventsByUser.values()) {
      let sessionStart: Date | null = null;
      let sessionHasError = false;

      for (const event of userEvents) {
        if (event.type === GameEventType.GAME_STARTED) {
          sessionStart = event.timestamp;
          sessionHasError = false;
          continue;
        }

        if (
          event.type === GameEventType.EVENT_LOGGED &&
          sessionStart &&
          this.isCriticalError(event)
        ) {
          sessionHasError = true;
        }

        if (event.type === GameEventType.SESSION_END && sessionStart) {
          totalSessions += 1;
          const durationMinutes =
            (event.timestamp.getTime() - sessionStart.getTime()) / 60000;
          if (durationMinutes >= 0) {
            sessionDurations.push(durationMinutes);
          }

          if (!sessionHasError) {
            errorFreeSessions += 1;
          }

          sessionStart = null;
          sessionHasError = false;
        }
      }
    }

    const averageSessionTime =
      sessionDurations.length > 0
        ? sessionDurations.reduce((sum, value) => sum + value, 0) /
          sessionDurations.length
        : 0;

    const errorFreeSessionRate = this.safeRate(
      errorFreeSessions,
      totalSessions,
    );

    return { averageSessionTime, errorFreeSessionRate };
  }
}
