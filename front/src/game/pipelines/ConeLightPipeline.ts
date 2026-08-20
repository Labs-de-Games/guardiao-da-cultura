import Phaser from "phaser";

const ConeFrag = [
  "#define SHADER_NAME PHASER_LIGHT_FS",
  "precision mediump float;",
  "struct Light",
  "{",
  "    vec2 position;",
  "    vec3 color;",
  "    float intensity;",
  "    float radius;",
  "};",
  "const int kMaxLights = %LIGHT_COUNT%;",
  "uniform vec4 uCamera;",
  "uniform vec2 uResolution;",
  "uniform sampler2D uMainSampler;",
  "uniform sampler2D uNormSampler;",
  "uniform vec3 uAmbientLightColor;",
  "uniform Light uLights[kMaxLights];",
  "uniform mat3 uInverseRotationMatrix;",
  "uniform int uLightCount;",
  "uniform vec2  uConeDirections[kMaxLights];",
  "uniform float uConeAngles[kMaxLights];",
  "uniform float uConeFalloffs[kMaxLights];",
  "uniform float uConeDiffuse[kMaxLights];",
  "varying vec2 outTexCoord;",
  "varying float outTexId;",
  "varying float outTintEffect;",
  "varying vec4 outTint;",
  "void main ()",
  "{",
  "    vec3 finalColor = vec3(0.0, 0.0, 0.0);",
  "    vec4 texel = vec4(outTint.bgr * outTint.a, outTint.a);",
  "    vec4 texture = texture2D(uMainSampler, outTexCoord);",
  "    vec4 color = texture * texel;",
  "    if (outTintEffect == 1.0)",
  "    {",
  "        color.rgb = mix(texture.rgb, outTint.bgr * outTint.a, texture.a);",
  "    }",
  "    else if (outTintEffect == 2.0)",
  "    {",
  "        color = texel;",
  "    }",
  "    vec3 normalMap = texture2D(uNormSampler, outTexCoord).rgb;",
  "    vec3 normal = normalize(uInverseRotationMatrix * vec3(normalMap * 2.0 - 1.0));",
  "    vec2 res = vec2(min(uResolution.x, uResolution.y)) * uCamera.w;",
  "    for (int index = 0; index < kMaxLights; ++index)",
  "    {",
  "        if (index < uLightCount)",
  "        {",
  "            Light light = uLights[index];",
  "            vec3 lightDir = vec3((light.position.xy / res) - (gl_FragCoord.xy / res), 0.1);",
  "            vec3 lightNormal = normalize(lightDir);",
  "            float distToSurf = length(lightDir) * uCamera.w;",
  "            float diffuseFactor = max(dot(normal, lightNormal), 0.0);",
  "            float radius = max((light.radius / res.x * uCamera.w) * uCamera.w, 0.0001);",
  "            float attenuation = clamp(1.0 - distToSurf * distToSurf / (radius * radius), 0.0, 1.0);",
  "            float halfAngle = uConeAngles[index];",
  "            float coneCos = cos(halfAngle);",
  "            vec2 rawDir = uConeDirections[index];",
  "            vec2 dir = (dot(rawDir, rawDir) > 0.0001) ? normalize(rawDir) : vec2(0.0, -1.0);",
  "            vec2 toFrag = normalize((gl_FragCoord.xy - light.position.xy) / res);",
  "            float cosAngle = dot(toFrag, dir);",
  "            float coneFactor = clamp((cosAngle - coneCos) / max(0.001, 1.0 - coneCos), 0.0, 1.0);",
  "            float beam = pow(max(coneFactor, 0.0001), max(uConeFalloffs[index], 0.0001));",
  "            float df = mix(1.0, diffuseFactor, uConeDiffuse[index]);",
  "            vec3 diffuse = light.color * df;",
  "            finalColor += (attenuation * beam * diffuse) * light.intensity;",
  "        }",
  "    }",
  "    vec4 colorOutput = vec4(uAmbientLightColor + finalColor, 1.0);",
  "    gl_FragColor = color * vec4(colorOutput.rgb * colorOutput.a, colorOutput.a);",
  "}",
].join("\n");

const LightPipeline = Phaser.Renderer.WebGL.Pipelines.LightPipeline;

export class ConeLightPipeline extends LightPipeline {
  defaultDirectionX = 0;
  defaultDirectionY = -1;
  defaultAngle = Math.PI;
  defaultFalloff = 1.2;

  private directionBuffer = new Float32Array(0);
  private angleBuffer = new Float32Array(0);
  private falloffBuffer = new Float32Array(0);
  private diffuseBuffer = new Float32Array(0);

  constructor(config: Phaser.Game | { game: Phaser.Game }) {
    const game =
      (config as { game?: Phaser.Game }).game ?? (config as Phaser.Game);
    super({ game, fragShader: ConeFrag });
  }

  setConeDegrees(deg: number) {
    this.defaultAngle = (deg * Math.PI) / 180;
  }

  addConeLight(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    color: number,
    intensity: number,
    angle: number,
    falloff: number = 1.2,
    directionX: number = this.defaultDirectionX,
    directionY: number = this.defaultDirectionY,
    // 1 = shaded by the fake surface normal, like every other cone
    // light (matches existing light bars/chandeliers). 0 = ignore the
    // normal entirely, so reach is governed purely by radius/angle —
    // the normal-based term collapses to near-zero at long range
    // (the light's implicit forward offset is tiny next to large
    // on-screen distances), which is what silently caps "reach" for
    // long beams no matter how big radius gets.
    diffuse: number = 1,
  ): Phaser.GameObjects.Light {
    const light = scene.lights.addLight(x, y, radius, color, intensity);
    (light as any)._coneAngle = angle / 2;
    (light as any)._coneFalloff = falloff;
    (light as any)._coneDirectionX = directionX;
    (light as any)._coneDirectionY = directionY;
    (light as any)._coneDiffuse = diffuse;
    return light;
  }

  onRender(scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera): void {
    super.onRender(scene, camera);

    const lightManager = scene.lights;
    if (!lightManager || !lightManager.active) return;

    const lights = lightManager.getLights(camera) as unknown as {
      light: Phaser.GameObjects.Light;
    }[];
    const renderer = this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    const maxLights: number =
      (renderer.config as { maxLights?: number }).maxLights ?? 10;
    const count = Math.min(lights.length, maxLights);

    const dirLen = count * 2;
    if (this.directionBuffer.length !== dirLen) {
      this.directionBuffer = new Float32Array(dirLen);
      this.angleBuffer = new Float32Array(count);
      this.falloffBuffer = new Float32Array(count);
      this.diffuseBuffer = new Float32Array(count);
    }

    for (let i = 0; i < count; i++) {
      const light = lights[i].light;
      const i2 = i * 2;
      this.directionBuffer[i2] =
        (light as any)._coneDirectionX ?? this.defaultDirectionX;
      this.directionBuffer[i2 + 1] =
        (light as any)._coneDirectionY ?? this.defaultDirectionY;
      this.angleBuffer[i] = (light as any)._coneAngle ?? this.defaultAngle / 2;
      this.falloffBuffer[i] =
        (light as any)._coneFalloff ?? this.defaultFalloff;
      this.diffuseBuffer[i] = (light as any)._coneDiffuse ?? 1;
    }

    this.set2fv("uConeDirections", this.directionBuffer);
    this.set1fv("uConeAngles", this.angleBuffer);
    this.set1fv("uConeFalloffs", this.falloffBuffer);
    this.set1fv("uConeDiffuse", this.diffuseBuffer);
  }
}
