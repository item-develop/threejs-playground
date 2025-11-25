import p5 from 'p5';

// 歪んだ円を描画する関数（滑らかバージョン）
export const drawDistortedCircle = (p: p5, x: number, y: number, size: number, distortionAmount: number = 0.15) => {
  p.beginShape();
  const segments = 20; // 頂点数を増やして滑らかに
  
  // 制御点を少なくして、その間を補間する
  const controlPoints = 8; // 歪みの制御点は少なめ
  const noiseValues: number[] = [];
  
  // 制御点でのノイズ値を事前計算
  for (let i = 0; i < controlPoints; i++) {
    const angle = (i / controlPoints) * p.TWO_PI;
    const noiseVal = p.noise(
      x * 0.01 + p.cos(angle) * 2,
      y * 0.01 + p.sin(angle) * 2
    );
    noiseValues.push(noiseVal);
  }
  
  // 多くの頂点を配置して、ノイズ値は補間する
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * p.TWO_PI;
    
    // 制御点間で補間
    const controlIndex = (i / segments) * controlPoints;
    const index1 = Math.floor(controlIndex) % controlPoints;
    const index2 = (index1 + 1) % controlPoints;
    const t = controlIndex - Math.floor(controlIndex);
    
    // スムーズに補間（cosine interpolation）
    const smoothT = (1 - Math.cos(t * Math.PI)) / 2;
    const noiseVal = noiseValues[index1] * (1 - smoothT) + noiseValues[index2] * smoothT;
    
    // 半径に歪みを適用
    const radius = (size / 2) * (1 + (noiseVal - 0.5) * distortionAmount);
    
    const vx = x + p.cos(angle) * radius;
    const vy = y + p.sin(angle) * radius;
    
    p.vertex(vx, vy);
  }
  p.endShape(p.CLOSE);
};