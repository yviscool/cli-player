
var Event = require('./event');
var Music = require('./music');
var Inquirer = require('./inquirer');

var BasePlayer = require('player');

var debug = require('debug')('player');

var { pipe, path, add, ifElse, gt, always, identity, subtract, __ } = require('ramda');

class InnerPlayer extends BasePlayer {

    constructor(songs) {
        super(songs);
        this.rl = new Event(this);
    }

    play() {
        // 开始播放
        super.play();
        // 监听键盘事件
        this.rl.listenKeyPress();
        //
    }

    /**
     * 增加音量
     */
    increaseVolume() {
        super.setVolume(
            pipe(
                path(['speaker', 'Speaker', 'volume']),
                add(0.1),
                ifElse(gt(__, 1), always(1), identity)
            )(this)
        )
    }

    /**
     * 减少音量
     */
    decreaseVolume() {
        super.setVolume(
            pipe(
                path(['speaker', 'Speaker', 'volume']),
                subtract(__, 0.1),
                ifElse(lt(__, 0), always(0), identity)
            )(this)
        );
    }

    /**
     * 随机播放，用不了
     */
    toggleRandom() {
        this.options.shuffle = !this.options.shuffle;
        return this;
    }

    /**
     * 切换上一首
     */
    previous() {
        var currentId = this.playing._id;
        if (currentId === 0) {
            currentId = this._list.length;
        }
        this.stop();
        this.play(currentId - 1);
        return this;
    }


    /**
     * 切换下一首
     */
    next() {
        super.stop();
        super.next();
        return this;
    }

}


class Player {

    constructor() {
        this.music = new Music();
        this.inquirer = new Inquirer(this.music);
    }

    async play() {

        var musicIds = await this.inquirer.prompt();

        debug('musicIds %O', musicIds);

        var urls = await this.getMp3Url(musicIds);

        var innerPlayer = new this.InnerPlayer(urls);

        innerPlayer.play();

        innerPlayer.on('error', err => {
            if (err.code === 'ETIMEDOUT') {
                console.error('timeout');
                return;
            }
            console.error(err)
        })
    }

    /**
     * 获取 mp3 的播放地址
     */
    getMp3Url(musicIds) {
        return this.music.getMp3Url(musicIds);
    }

}

Player.prototype.InnerPlayer = InnerPlayer;

module.exports = Player;