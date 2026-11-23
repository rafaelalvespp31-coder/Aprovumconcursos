/** Trechos de GLSL compartilhados pelos efeitos da cena. */
export const RUIDO = /* glsl */ `
float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash21(i), hash21(i + vec2(1., 0.)), f.x), mix(hash21(i + vec2(0., 1.)), hash21(i + vec2(1., 1.)), f.x), f.y);
}
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * noise(p); p = p * 2.03 + vec2(17., 9.); a *= .5; } return s; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
`;

/** Oclusão: canal R = personagem inteiro (fica na frente das brasas e da fumaça), canal G = só a mão (fica na frente da esfera). */
export const OCLUSAO = /* glsl */ `
uniform sampler2D uMatte;
uniform vec2 uRes;
float ocluido(float forca){ return texture2D(uMatte, gl_FragCoord.xy / uRes).r * forca; }
float ocluidoMao(float forca){ return texture2D(uMatte, gl_FragCoord.xy / uRes).g * forca; }
`;
