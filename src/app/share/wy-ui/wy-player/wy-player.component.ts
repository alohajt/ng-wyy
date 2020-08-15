import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, Inject } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { AppStoreModule } from '../../../store/index';
import { getSongList, getPlayList, getCurrentIndex, getPlayMode, getCurrentSong, getPlayer } from '../../../store/selectors/player.selector';
import { Song } from '../../../services/data-types/common.types';
import { PlayMode } from './player-type';
import { SetCurrentIndex } from 'src/app/store/actions/player.actions';
import { Subscription, fromEvent } from 'rxjs';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-wy-player',
  templateUrl: './wy-player.component.html',
  styleUrls: ['./wy-player.component.less']
})
export class WyPlayerComponent implements OnInit {

  percent = 0;
  bufferPercent = 0;

  songList: Song[];
  playList: Song[];
  currentIndex: number;
  currentSong: Song;

  duration: number;
  currentTime: number;

  // 播放状态 playing status
  playing = false;

  // 是否可以播放 play or not
  songReady = false;

  // 音量 volume
  volume = 60;

  // 是否显示音量面板 if show volume panel 
  showVolumnPanel = false;

  // 是否点击的是音量面板本身 if click on volume panel
  selfClick = false;

  private winClick: Subscription;


  @ViewChild('audio', { static: true }) private audio: ElementRef;
  private audioEl: HTMLAudioElement;


  constructor(
    private store$: Store<AppStoreModule>,
    @Inject(DOCUMENT) private doc: Document
  ) {
    const appStore$ = this.store$.pipe(select(getPlayer));
    appStore$.pipe(select(getSongList)).subscribe(list => this.watchList(list, 'songList'));
    appStore$.pipe(select(getPlayList)).subscribe(list => this.watchList(list, 'playList'));
    appStore$.pipe(select(getCurrentIndex)).subscribe(index => this.watchCurrentIndex(index));
    appStore$.pipe(select(getPlayMode)).subscribe(mode => this.watchPlayMode(mode));
    appStore$.pipe(select(getCurrentSong)).subscribe(song => this.watchCurrentSong(song));
  }

  ngOnInit() {
    this.audioEl = this.audio.nativeElement;
  }



  private watchList(list: Song[], type: string) {
    this[type] = list;
  }

  private watchCurrentIndex(index: number) {
    this.currentIndex = index;
  }

  private watchPlayMode(mode: PlayMode) {
    console.log('mode :', mode);
  }

  private watchCurrentSong(song: Song) {
    if (song) {
      this.currentSong = song;
      this.duration = song.dt / 1000;
      console.log('song :', song);
    }
  }

  onPercentChange(per: number) {
    if (this.currentSong) {
      this.audioEl.currentTime = this.duration * (per / 100);
    }
  }

  // 控制音量 control volume
  onVolumeChange(per: number) {
    this.audioEl.volume = per / 100;
  }

  // 控制音量面板 control volume panel
  toggleVolPanel(evt: MouseEvent) {
    // evt.stopPropagation();
    this.togglePanel();
  }

  togglePanel() {
    this.showVolumnPanel = !this.showVolumnPanel;
    if (this.showVolumnPanel) {
      this.bindDocumentClickListener();
    } else {
      this.unbindDocumentClickListener();
    }
  }

  private bindDocumentClickListener() {
    if (!this.winClick) {
      this.winClick = fromEvent(this.doc, 'click').subscribe(() => {
        if (!this.selfClick) {  // 说明点击了播放器以外的部分 click outside of player panel
          this.showVolumnPanel = false;
          this.unbindDocumentClickListener();
        }
        this.selfClick = false;
      });
    }
  }


  private unbindDocumentClickListener() {
    if (this.winClick) {
      this.winClick.unsubscribe();
      this.winClick = null;
    }
  }


  // 播放/暂停 play/pause
  onToggle() {
    if (!this.currentSong) {
      if (this.playList.length) {
        this.updateIndex(0);
      }
    } else {
      if (this.songReady) {
        this.playing = !this.playing;
        if (this.playing) {
          this.audioEl.play();
        } else {
          this.audioEl.pause();
        }
      }
    }
  }

  // 上一曲 last song
  onPrev(index: number) {
    if (!this.songReady) return;
    if (this.playList.length === 1) {
      this.loop();
    } else {
      const newIndex = index <= 0 ? this.playList.length - 1 : index;
      this.updateIndex(newIndex);
    }
  }


  // 下一曲 next song
  onNext(index: number) {
    if (!this.songReady) return;
    if (this.playList.length === 1) {
      this.loop();
    } else {
      const newIndex = index >= this.playList.length ? 0 : index;
      this.updateIndex(newIndex);
    }
  }

  // 单曲循环 repeat a song
  private loop() {
    this.audioEl.currentTime = 0;
    this.play();
  }


  private updateIndex(index: number) {
    this.store$.dispatch(SetCurrentIndex({ currentIndex: index }));
    this.songReady = false;
  }

  onCanplay() {
    this.songReady = true;
    this.play();
  }

  onTimeUpdate(e: Event) {
    this.currentTime = (<HTMLAudioElement>e.target).currentTime;
    this.percent = (this.currentTime / this.duration) * 100;
    const buffered = this.audioEl.buffered;
    if (buffered.length && this.bufferPercent < 100) {
      this.bufferPercent = (buffered.end(0) / this.duration) * 100;
    }
  }

  private play() {
    this.audioEl.play();
    this.playing = true;
  }

  get picUrl(): string {
    return this.currentSong ? this.currentSong.al.picUrl : '//s4.music.126.net/style/web2/img/default/default_album.jpg';
  }
}
