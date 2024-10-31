const ignore = [
  /* 1, 4, 7,
  12, 15, 16,
  23, 26, 27, */
  24, 25,
]
export const random = (len: number, exclude: number[]): number => {
  const j = Math.floor(Math.random() * len);
  const ig = ignore.includes(j)
  if (ig || exclude.includes(j)) {
    return random(len, exclude)
  }
  else {
    return j
  }
}
export const random2 = (len: number, exclude: number): number => {
  const j = Math.floor(Math.random() * len);
  const ig = ignore.includes(j)
  if (ig || j === exclude) {
    return random2(len, exclude)
  }
  else {
    return j
  }
}


export function controlledShuffle<T>(array: T[], shuffleRate: number, yohaku = true): T[] {
  // 入力値の検証
  if (shuffleRate < 0 || shuffleRate > 1) {
    throw new Error("シャッフル率は0から1の間である必要があります");
  }

  // 配列のコピーを作成
  const result = [...array];
  const length = array.length;

  // シャッフルする要素数を計算（小数点以下切り上げ）
  const elementsToShuffle = Math.ceil(length * shuffleRate);

  // Fisher-Yatesアルゴリズムの修正版を使用
  for (let _i = 0; _i < elementsToShuffle; _i++) {
    // まだシャッフルしていない要素からランダムに選択
    const i = Math.floor(length * Math.random());
    // まだシャッフルしていない要素からランダムに選択
    const inc = ignore.includes(i)
    if (inc && yohaku) {
      continue
    } else {
      let j = 0
      if (yohaku) {
        j = random(length, [i, ...ignore]) as number
      } else {
        j = random(length, [i]) as number
      }
      [result[i], result[j]] = [result[j], result[i]];
    }
  }

  return result;
}
export function controlledShuffle2<T>(array: T[], shuffleRate: number, yohaku = true): T[] {
  // 入力値の検証
  if (shuffleRate < 0 || shuffleRate > 1) {
    throw new Error("シャッフル率は0から1の間である必要があります");
  }

  // 配列のコピーを作成
  const result = [...array];
  const length = array.length;

  // シャッフルする要素数を計算（小数点以下切り上げ）
  const elementsToShuffle = Math.ceil(length * shuffleRate);

  // Fisher-Yatesアルゴリズムの修正版を使用
  for (let _i = 0; _i < elementsToShuffle; _i++) {
    // まだシャッフルしていない要素からランダムに選択
    const i = Math.floor(length * shuffleRate);
    const inc = ignore.includes(i % 11)
    if (inc && yohaku) {
      continue
    } else {
      let j = 0
      j = random2(length, i) as number
      [result[i], result[j]] = [result[j], result[i]];
    }
  }

  return result;
}

import * as THREE from 'three';


export const shuffleEase = (initArray: number[], _timer: any, onChange: () => void, count: number, indexNum: number, isLogo = false) => {
  let _instanceIndices = initArray
  const allRate = 50
  const logologo = 15
  const logo = (count % allRate) < logologo
  if (logo) {
    _timer = setTimeout(() => {
      onChange()
    }, 100);
  } else {
    const x = ((count % allRate) - logologo) / (allRate - logologo)
    const f = (x: number) => Math.pow(Math.sin(x * 1 * Math.PI), 2)
    /* const f2 = (x: number) => Math.pow(
      -4 * x * (x - 1)
      , 2) */
    _instanceIndices = controlledShuffle(_instanceIndices, f(x), isLogo)
    /* if (isLogo && f(x) > 0.005) {
      _instanceIndices[_instanceIndices.length - 1] = 0
    } */
    _timer = setTimeout(() => {
      onChange()
    }, Math.max(80, (1 - f(x)) * 200));
  }

  const instanceIndices = new Float32Array(
    indexNum
  );
  for (
    var l = 0; l < instanceIndices.length; l++
  ) {
    instanceIndices[l] = _instanceIndices[l];
  }
  return new THREE.InstancedBufferAttribute(instanceIndices, 1)
}