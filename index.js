'use strict';
var fuzzy = require('fuzzy');
var inquirer = require('inquirer');
var MusicApi = require('@suen/music-api');

var readline = require('readline');
var MuteStream = require('mute-stream');
var InnerPlayer = require('player');

var R = require('ramda');
var { fromEvent, of } = require('rxjs').Observable;
var { filter, concatMap } = require('rxjs').operators;

var CheckBoxPlusPrompt = require('./checkbox');

inquirer.registerPrompt('checkbox-plus', CheckBoxPlusPrompt);


class Music {

    constructor() {
        this.api = MusicApi;
        this.limit = 20;
        this.offset = 0;
        this.sources = ['qq', 'netease', 'xiami'];
        this.currentSource = this.sources[0];
    }

    search(key = '周杰伦') {
        var source = this.currentSource;
        return this.api[source].searchSong({
            keyword: key,
            limit: this.limit,
            offset: this.offset
        })
    }

    getAlbum(id) {
        return this.api.getSongDetail(this.currentSource, id);
    }

    getRealUrl(id) {
        return this.api.default.getSongUrl(this.currentSource, id);
    }

}


class Player extends InnerPlayer {
    constructor(songs) {
        super(songs)
    }

    increaseVolume() {
        var volume = this.speaker.Speaker.volume + 0.1;
        super.setVolume(volume > 1 ? 1 : volume);
    }

    decreaseVolume() {
        var volume = this.speaker.Speaker.volume - 0.1;
        super.setVolume(volume < 0 ? 0 : volume);
    }

}

class Event {

    constructor(player) {
        this.player = player;
        // this.rl = this.createInterface();
        // this.rl.output.mute(); //停止写入
    }

    createInterface() {
        // return readline.createInterface({
        //     terminal: true,
        //     input: process.stdin,
        //     output: ms,
        // })
    }

    listenKeyPress() {
        var player = this.player;
        // var { input, output } = this.rl;
        fromEvent(process.stdin, 'keypress', (value, key) => {
            return { value: value, key: key || {} }
        })
            .pipe(filter(({ key }) => key.name !== 'enter' && key.name !== 'return'))
            .pipe(
                concatMap(input => {
                    var { key } = input;
                    if (key.name === 'h') {
                        //todo 
                        try {
                            // 存在bug， 找不到该方法， 
                            player.previous();
                        } catch (e) {
                            return of(input)
                        }
                    }
                    return of(input);
                }),
                concatMap(input => {
                    var { key } = input;
                    if (key.name === 'l') {
                        player.next();
                    }
                    return of(input)
                }),
                concatMap(input => {
                    var { key } = input;
                    if (key.name === 'x') {
                        player.pause();
                    }
                    return of(input);
                }),
                concatMap(input => {
                    var { key } = input;
                    if (key.name === 'X') {
                        player.stop();
                    }
                    return of(input)
                }),
                concatMap(input => {
                    var { key } = input;
                    if (key.sequence === ',' || key.sequence === '[') {
                        player.decreaseVolume();
                    }
                    return of(input)
                }),
                concatMap(input => {
                    var { key } = input;
                    if (key.sequence === '.' || key.sequence === ']') {
                        player.increaseVolume();
                    }
                    return of(input)
                }),
        )
            .forEach(x => { })
        process.stdin.setRawMode(true)
        process.stdin.resume()
    }
}


class Inquirer {

    constructor(music) {
        this.inquirer = inquirer;
        this.songMap = new Map();
        this.lastInput = '周杰伦';
        this.checkBoxPlusParam = {
            type: 'checkbox-plus',
            name: 'song',
            highlight: true,
            message: '搜索你想要歌曲?',
            searchable: true,
            source: this.feachSongs.bind(this),
        }
        this.params = [this.checkBoxPlusParam];
        this.music = music;
    }

    prompt() {
        return this.inquirer.prompt(this.params)
            .then(R.path(['song']))
    }

    feachSongs(answer, input = '') {
        var self = this;
        return Promise
            .resolve(this.music.search(input || this.lastInput))
            .then(msg => {


                var songMap = self.songMap;

                // songMap.clear();

                self.lastInput = input;

                msg = R.pipe(
                    R.path(['data', 'songs']),
                    R.map(R.pick(['id', 'name', 'artists']))
                )(msg)

                var songIds = R.pluck('id', msg);

                var songNames = R.pluck('name', msg);

                var artists = R.pipe(
                    R.pluck('artists'),
                    R.flatten,
                    R.pluck('name')
                )(msg);


                var choices = songNames.map((name, i) => {
                    var songName = name + `  ${artists[i]}`;
                    songMap.set(name, songIds[i]);
                    return songName;
                })

                var songs = [...choices];

                var fuzzyResult = fuzzy.filter(input, songs);

                var data = fuzzyResult.map(element => element.original);

                return data;
            })
    }

}

(async () => {

    var music = new Music();

    var msg = await music.search();

    var inquirer = new Inquirer(music);

    var songs = await inquirer.prompt();

    var songMap = inquirer.songMap;

    // console.log(songMap);
    // console.log(songs);

    var ids = R.pipe(
        R.map(song => song.substring(0, song.lastIndexOf(' ')).trim()),
        R.map(song => songMap.get(song)),
        R.reject(R.prop(undefined))
    )(songs);


    var urlInfo = await Promise.all(R.map(id => music.getRealUrl(id), ids));


    var urls = R.map(R.path(['data', 'url']), urlInfo);


    var player = new Player(urls)

    player.play()

    new Event(player).listenKeyPress();

})().catch(console.log)