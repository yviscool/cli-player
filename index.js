
'use strict';

var Songs = require('./songs');
var Player = require('./player');
var Music = require('./music');
var Event = require('./event');

var chalk = require('chalk');
var inquirer = require('inquirer');
inquirer.registerPrompt('checkbox-plus', require('./checkbox'));

var R = require('ramda');

class Inquirer {

    constructor(music) {
        this.inquirer = inquirer;
        this.defaultInput = '周杰伦';
        this.checkBoxPlusParam = {
            type: 'checkbox-plus',
            name: 'song',
            highlight: chalk.cyan,
            message: '搜索你想要歌曲?',
            searchable: true,
            source: this.feachSongs.bind(this),
            answer: this.handleSelection.bind(this),
        }
        this.params = [this.checkBoxPlusParam];
        this.music = music;
        this.songs;
    }

    prompt() {
        var promise = this.inquirer.prompt(this.params)
        // prompt 会给 promsie设置一个 ui 对象， activePrompt为当前响应的 prompt
        this.listenQuery(promise.ui.activePrompt);
        return promise
            .then(R.path(['song']))
            .catch(console.log)
    }

    feachSongs(answer, input = '') {
        var self = this;
        var music = this.music;
        return Promise
            .resolve(music.search.call(music, input || this.defaultInput))
            .then(msg => {

                if (!msg) {
                    return [];
                }

                // 拼凑 构造参数
                var args = R.pipe(
                    R.path(['data', 'songs']),
                    R.map(R.pick(['id', 'name', 'album', 'artists',])),
                    R.map(R.evolve({
                        album: R.prop('name'),
                        artists: R.pipe(R.pluck('name'), R.join('/'))
                    })),
                    R.map(R.values),
                )(msg)


                if (self.songs) {
                    self.songs.clear();
                    self.songs.add(args);
                } else {
                    self.songs = new Songs(args);
                }
                return self.songs.getSelection();

            })
            .catch(console.log)
    }

    handleSelection(selection) {
        return selection.length > 3 ? selection.slice(0, 3) + '....' : selection;
    }

    // 监听 ctrl+q 事件
    listenQuery(prompt) {

        var { events } = prompt;

        var music = this.music;

        events.keypress
            .filter(({ key }) => key.name === 'q' && (key.meta || key.ctrl))
            .share()
            .forEach((x) => {
                music.switchSource();
                prompt.onKeypress.call(prompt, x)
            })
    }

    parseUrls(urlInfo) {
        return this.music.parseUrls(urlInfo);
    }
}

(async () => {

    var music = new Music();

    var msg = await music.search();

    var inquirer = new Inquirer(music);

    var ids = await inquirer.prompt();

    var urlInfo = await Promise.all(R.map(id => music.getRealUrl(id).catch(() => false), ids));

    var urls = inquirer.parseUrls(urlInfo);

    var player = new Player(urls);

    player.play() && new Event(player).listenKeyPress();

})().catch(console.log)


process.on('uncaughtException', (err) => {
    console.log(err);
})