import videojs from "video.js";
import Player from "video.js/dist/types/player";

export default class CustomVideoPlayer {
  videoId: string;
  options: any;
  loadingPercent: number;
  onLoad?: () => void;
  onPlay?: () => void;
  loaded: boolean;
  player: Player;
  inview: boolean;

  constructor(videoId: string, options: any, onLoad?: any, onPlay?: any) {
    this.videoId = videoId;
    this.options = options;
    this.loadingPercent = 0;
    this.onLoad = onLoad;
    this.onPlay = onPlay;
    this.loaded = false;
    this.inview = false;
    const defaultOptions = {
      autoplay: false,
      playsinline: true,
      controls: false,
      muted: true,
      preload: "auto",
    };
    this.player = videojs(this.videoId, { ...defaultOptions, ...this.options });
    this.init();
  }

  init() {
    //const video = document.querySelector(`#${this.videoId} video`) as any;
    this.player.on("playing", () => {
      this.onPlay && this.onPlay();
      document
        .getElementById(this.videoId + "-poster")
        ?.classList.add("hidden");
    });

    this.player.ready(() => {
      if (!this.loaded) {
        this.loaded = true;
        this.onLoad && this.onLoad();
      }
      this.player.play();
      setTimeout(() => {
        if (!this.inview) {
          this.player.pause();
          this.player.currentTime(0);
        }
      }, 1500);
    });

    const video = document.getElementById(this.videoId);

    const callback = (entries: any) => {
      entries.forEach((entry: any) => {
        if (entry.isIntersecting) {
          this.player.play();
          this.inview = true;
        } else {
          this.player.pause();
          this.inview = false;
        }
      });
    };
    const observer = new IntersectionObserver(callback, {
      root: null,
      rootMargin: "0px 0px 200px 0px",
      threshold: 0,
    });

    observer.observe(video!);

    //video?.load();
  }

  currentTime(number: number) {
    this.player.currentTime(number);
  }

  isPlaying() {
    return !this.player.paused();
  }
  play() {
    this.player.play();
  }

  pause() {
    this.player.pause();
  }

  changeSeekBarWidth(width: number) {
    const seekBar = (this.player as any).controlBar.progressControl.seekBar;
    seekBar.el_.style.width = width;
  }

  changeSeekBarColor(color: string) {
    const seekBar = (this.player as any).controlBar.progressControl.seekBar;
    seekBar.el_.style.backgroundColor = color;
  }
}
