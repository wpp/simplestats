# simplestats

A wrapper around `PeerConnection.getStats`.

Currently tested with Chrome only.

**TODO** improve README. For now have a look in `simpleStats.js`.

## Stats:

    stats = {
      timestamp,  # timestamp of results
      results,    # original results
      channels,   #
      audio,      #
      video       #
    }

## Usage:

    peerConnection.getSimpleStats(function(result) {
      // getSimpleStats instead of getStats
    });
