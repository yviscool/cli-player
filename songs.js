var { concat, map, evolve, prop, concat, toString } = require('ramda');

class Song {

    constructor(id, name, album, artists) {
        Object.assign(this, { id, name, album, artists })
    }

    toString() {
        return `${this.name}(${this.album})  ${this.artists}`
    }

}

class Songs {

    constructor(songs) {
        this.songs = this.parseSongs(songs);
    }

    add(songs) {
        var songs = this.parseSongs(songs);
        this.songs = concat(songs)(this.songs);
    }

    get(selector) {
        return this.songs[selector];
    }

    clear() {
        this.songs = [];
    }

    parseSongs(songs) {
        return map(args => new Song(...args))(songs)
    }

    getMessage() {
        // return map(song => '' + song)(this.songs);
        return map(toString)(this.songs);
    }

    getSelection() {
        return map( song => 
            ({
                name: song.toString(),
                short: song.name,
                value: song.id,
            })
        )(this.songs);
    }

}

module.exports = Songs;