'use strict';

var Songs = require('./songs');

var debug = require('debug')('inquirer');

var chalk = require('chalk');
var figures = require('figures');
var inquirer = require('inquirer');

var { filter, takeUntil, share } = require('rxjs/operators')
var { path, concat, pluck, pipe, map, evolve, prop, pick, join, ifElse, identity, slice, length, gt, values, __ } = require('ramda');

inquirer.registerPrompt('checkbox-plus', require('inquirer-checkbox-plus'));

class Inquirer {

    constructor(music) {
        this.inquirer = inquirer;
        this.music = music;
        this.defaultInput = '周杰伦';
        this.songs;
    }

    prompt() {
        var params = {
            type: 'checkbox-plus',
            name: 'song',
            highlight: chalk.cyan,
            message: '搜索你想要歌曲?',
            searchable: true,
            enablebackspace: true,
            source: this.feachSongs.bind(this),
            answer: this.handleSelection.bind(this),
            footer: this.footer.bind(this),
            header: this.header.bind(this),
            keypress: this.keypress.bind(this),
            searching: this.searching.bind(this),
            noresult: this.noresult.bind(this),
        }
        // prompt 会给 promsie设置一个 ui 对象， activePrompt为当前响应的 prompt
        var promise = this.inquirer.prompt([params])
        return promise.then(path(['song']))
    }

    feachSongs(answer, input = '') {
        var music = this.music;
        return Promise
            .resolve(music.search.call(music, input || this.defaultInput))
            .then(msg => {

                if (msg.status === false) return [];

                // 拼凑 构造参数
                var args = pipe(
                    path(['data', 'songs']),
                    map(pick(['id', 'name', 'album', 'artists'])),
                    map(evolve({
                        album: prop('name'),
                        artists: pipe(pluck('name'), join('/'))
                    })),
                    map(values),
                )(msg)


                if (this.songs) {
                    this.songs.clear();
                    this.songs.add(args);
                } else {
                    this.songs = new Songs(args);
                }

                debug(this.songs.getSelection());

                return this.songs.getSelection();
            })
            .catch(() => [])
    }

    validate() { }

    header() {
        return `<${chalk.white("ctrl+q")}> 切换搜索引擎 <${chalk.white("space")}> 选中`;
    }

    footer() {
        return ` ${figures.pointer}${figures.pointer} 按 ${chalk.white(figures.arrowUp)} ${chalk.white(figures.arrowDown)} 键移动`;
    }

    searching() {
        return '正在努力搜索中...'
    }

    noresult() {
        return '未找到任何结果...'
    }


    handleSelection(selection) {
        return ifElse(
            pipe(
                length,
                gt(__, 3)
            ),
            pipe(
                slice(0, 3),
                join(','),
                concat(__, '....')
            ),
            identity
        )(selection)
    }


    parseUrls(urlInfo) {
        return this.music.parseUrls(urlInfo);
    }

    keypress(events, validation, prompt) {
        var music = this.music;

        events.AllKey = events.keypress
            .pipe(
                filter(({ key }) => key.name === 'a' && (key.ctrl || key.meta)),
                share(),
            )

        events.InverseKey = events.keypress
            .pipe(
                filter(({ key }) => key.name === 'i' && (key.ctrl || key.meta)),
                share(),
            )

        events.SearchKey = events.keypress
            .pipe(
                filter(({ key }) => key.name === 'q' && (key.ctrl || key.meta)),
                share(),
            )

        events.AllKey
            .pipe(takeUntil(validation.success))
            .forEach(prompt.onAllKey.bind(prompt));

        events.InverseKey
            .pipe(takeUntil(validation.success))
            .forEach(prompt.onInverseKey.bind(prompt));

        events.SearchKey
            .pipe(takeUntil(validation.success))
            .forEach((x) => {
                music.switchSource();
                prompt.toggleSearch();
                prompt.onKeypress(x)
                prompt.toggleSearch();
            })

    }

}


module.exports = Inquirer;