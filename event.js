
var readline = require('readline');
var MuteStream = require('mute-stream');

var { fromEvent } = require('rxjs');
var { filter, map, tap } = require('rxjs/operators');

var { pipe, path, when, equals, either } = require('ramda');


class Event {

    constructor(player) {
        this.player = player;
        this.rl = this.createInterface();
        this.rl.output.mute(); //停止写入
    }

    createInterface() {
        var ms = new MuteStream();
        ms.pipe(process.stdout);
        return readline.createInterface({
            terminal: true,
            input: process.stdin,
            output: ms,
        })
    }

    listenKeyPress() {
        var { input, /**output**/ } = this.rl;
        fromEvent(input, 'keypress', (value, key) => ({ value: value, key: key || {} }))
            .pipe(filter(({ key }) => key.name !== 'enter' && key.name !== 'return'))
            .pipe(
                tap(this.hKey()),
                tap(this.lKey()),
                tap(this.stopKey()),
                tap(this.pauseKey()),
                tap(this.increseKey()),
                tap(this.decreaseKey()),
            )
            .forEach(x => { })
    }

    hKey() {
        return pipe(
            path(['key', 'name']),
            when(
                equals('h'),
                // to do 
                () => { this.player.previous() }
            )
        )
    }

    lKey() {
        return pipe(
            path(['key', 'name']),
            when(
                equals('l'),
                () => { this.player.next() },
            )
        )
    }

    stopKey() {
        return pipe(
            path(['key', 'name']),
            when(
                equals('x'),
                () => { this.player.pause() },
            )
        )
    }

    pauseKey() {
        return pipe(
            path(['key', 'name']),
            when(
                equals('X'),
                () => { this.player.stop() },
            )
        )
    }

    increseKey() {
        return pipe(
            path(['key', 'sequence']),
            when(
                either(equals(','), equals('[')),
                () => { this.player.decreaseVolume() },
            )
        )
    }

    decreaseKey() {
        return pipe(
            path(['key', 'sequence']),
            when(
                either(equals('.'), equals(']')),
                () => { this.player.increaseVolume() },
            )
        )
    }
}

module.exports = Event;