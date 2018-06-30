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

    toggleRandom() {
        this.options.shuffle = !this.options.shuffle;
        return this;
    }

    previous() {
        var currentId = this.playing._id;
        if (currentId === 0) {
            currentId = this._list.length;
        }
        this.stop();
        this.play(currentId - 1);
        return this;
    }


    next() {
        super.stop();
        super.next();
        return this;
    }


}

module.exports = Player;