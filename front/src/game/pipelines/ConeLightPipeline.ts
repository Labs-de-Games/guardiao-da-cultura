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
  "            float radius = (light.radius / res.x * uCamera.w) * uCamera.w;",
  "            float attenuation = clamp(1.0 - distToSurf * distToSurf / (radius * radius), 0.0, 1.0);",
  "            float halfAngle = uConeAngles[index];",
  "            float coneCos = cos(halfAngle);",
  "            vec2 dir = normalize(uConeDirections[index]);",
  "            vec2 toFrag = normalize((gl_FragCoord.xy - light.position.xy) / res);",
  "            float cosAngle = dot(toFrag, dir);",
  "            float coneFactor = clamp((cosAngle - coneCos) / max(0.001, 1.0 - coneCos), 0.0, 1.0);",
  "            float beam = pow(coneFactor, uConeFalloffs[index]);",
  "            vec3 diffuse = light.color * diffuseFactor;",
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
  ): Phaser.GameObjects.Light {
    const light = scene.lights.addLight(x, y, radius, color, intensity);
    (light as any)._coneAngle = angle / 2;
    (light as any)._coneFalloff = falloff;
    (light as any)._coneDirectionX = this.defaultDirectionX;
    (light as any)._coneDirectionY = this.defaultDirectionY;
    return light;
  }

  onRender(scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera): void {
    super.onRender(scene, camera);

    const lightManager = scene.lights;
    if (!lightManager || !lightManager.active) return;

    const lights = lightManager.getLights(camera) as unknown as {
      light: Phaser.GameObjects.Light;
    }[];
    const count = lights.length;

    for (let i = 0; i < count; i++) {
      const light = lights[i].light;
      const halfAngle = (light as any)._coneAngle ?? this.defaultAngle / 2;
      const falloff = (light as any)._coneFalloff ?? this.defaultFalloff;
      const dirX = (light as any)._coneDirectionX ?? this.defaultDirectionX;
      const dirY = (light as any)._coneDirectionY ?? this.defaultDirectionY;

      this.set2f("uConeDirections[" + i + "]", dirX, dirY);
      this.set1f("uConeAngles[" + i + "]", halfAngle);
      this.set1f("uConeFalloffs[" + i + "]", falloff);
    }
  }
}
