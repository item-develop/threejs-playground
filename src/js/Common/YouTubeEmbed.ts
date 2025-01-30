"use strict";

const defaultParams = {
  autoplay: 1, // 0 = 再生しない(デフォ) 1 = 再生する
  controls: 1, // 0 = 表示しない 1 = 表示する(デフォ)
  rel: 0, // 0 = 同じチャンネルから関連動画が選択
};

export default class YouTubeEmbed {
  elementId: string;
  params: any;
  youtubeId: any;
  player: any;
  constructor(elementId: string, params = {}) {
    this.elementId = elementId;
    this.params = { ...defaultParams, ...params };
    this.youtubeId = null;
    this.player = null;

    this.init();
  }

  init() {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const scripts = document.getElementsByTagName("script");

    let hasYouTubeScript = false;
    Array.prototype.forEach.call(scripts, (script) => {
      if (!hasYouTubeScript) hasYouTubeScript = script.src === tag.src;
    });
    if (hasYouTubeScript) return;

    const firstScriptTag = scripts[0] as any;
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag); // HTML上に挿入

    // window.onYouTubeIframeAPIReady = this.create
  }

  create = (youtubeId: string) => {
    if (this.youtubeId === youtubeId) return;
    this.youtubeId = youtubeId;
    // eslint-disable-next-line no-undef
    if (!this.player) {
      /* this.player = new (YT as any).Player(this.elementId, {
        videoId: youtubeId,
        playerVars: this.params,
      }); */
    } else {
      this.player.loadVideoById(youtubeId);
    }
  };

  play = () => {
    if (this.player) this.player.playVideo();
  };

  pause = () => {
    if (this.player) this.player.pauseVideo();
  };

  stop = () => {
    if (this.player) this.player.stopVideo();
  };
}
