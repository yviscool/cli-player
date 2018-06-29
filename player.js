var InnerPlayer = require('player');
var { chooseRandom } = require('player/dist/utils');
var R = require('ramda');
var _ = require('underscore');

class Player extends InnerPlayer {
    constructor(songs) {
        super(songs)
    }

    increaseVolume() {
        super.setVolume(
            R.pipe(
                R.path(['speaker', 'Speaker', 'volume']),
                R.add(0.1),
                R.ifElse(R.gt(R.__, 1), R.always(1), R.identity)
            )(this)
        )
    }

    decreaseVolume() {
        super.setVolume(
            R.pipe(
                R.path(['speaker', 'Speaker', 'volume']),
                R.subtract(R.__, 0.1),
                R.ifElse(R.lt(R.__, 0), R.always(0), R.identity)
            )(this)
        );
    }

    // 0.6.1 版本没有该方法。。github却有, 加上去执行不了，等待解决。。。
    // previous() {
    //     let list = this._list;
    //     let current = this.playing;
    //     let previousIndex = this.options.shuffle ?
    //         chooseRandom(_.difference(list, [current._id])) :
    //         current._id - 1

    //     if (previousIndex < 0) {
    //         this.emit('error', 'No previous song was found')
    //         this.emit('finish', current)
    //         return this;
    //     }

    //     this.stop()
    //     this.play(previousIndex)

    //     return this
    // }

}

module.exports = Player;