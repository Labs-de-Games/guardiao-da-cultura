import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  CampaignLinkApiError,
  deleteCampaignLink,
} from "@/lib/edital/server/campaignLinks";
import { resolveScope } from "@/lib/edital/server/scope";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = resolveScope(session);
  if (!scope) {
    return NextResponse.json({ error: "Not linked" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await deleteCampaignLink(scope, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof CampaignLinkApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Erro ao excluir link" },
      { status: 502 },
    );
  }
}
