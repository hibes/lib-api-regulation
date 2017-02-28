"use strict";

let DEFAULT_REQUEST_LIMIT_PER_MINUTE = 10;
let DEFAULT_MAX_FREQUENCY_PER_TICKER = 30000;
let DEFAULT_POLL_CHECK_FREQUENCY = 1000;

function LibAPIRegulation(config) {
  if (config) {
    this.config = config;
  } else {
    this.config = {};
  }

  if (this.config.requestLimitPerMinute === undefined) {
    this.config.requestLimitPerMinute = DEFAULT_REQUEST_LIMIT_PER_MINUTE;
  }

  if (this.config.maxFrequencyPerTicker === undefined) {
    this.config.maxFrequencyPerTicker = DEFAULT_MAX_FREQUENCY_PER_TICKER;
  }

  if (this.config.pollCheckFrequency === undefined) {
    this.config.pollCheckFrequency = DEFAULT_POLL_CHECK_FREQUENCY;
  }

  this.pollingIds = [];
  this.tickerCallbacks = [];
  this.lastPolls = [];
  this.shortTermPollHistory = [];

  this.addTicker = (id) => { this.pollingIds.push(id); };
  this.removeTicker = (id) => {
    this.pollingIds = this.pollingIds.filter((pollingId) => { return pollingId != id; });
  };

  this.registerTickerCallback = (id, callback) => {
    this.tickerCallbacks.push({
      "id": id,
      "callback": callback
    });
  };

  this.getTime = () => {
    return (new Date()).getTime();
  };

  this.setLastPollTime = (id) => {
    let lastPoll = this.getLastPollById(id);

    return lastPoll;
  };

  this.tooManyPolls = (id) => {
    let cmc = this;

    cmc.shortTermPollHistory = cmc.shortTermPollHistory.filter((pollTime) => {
      return (cmc.getTime() - pollTime < 60000); // One minute
    });

    if (cmc.shortTermPollHistory.length >= cmc.config.requestLimitPerMinute) {
      return true;
    }

    if (cmc.getLastPollById(id) && (cmc.getTime() - cmc.getLastPollById(id).time < cmc.config.maxFrequencyPerTicker)) {
      return true;
    }

    return false;
  };

  this.start = () => {
    if (this.interval === undefined) {
      this.interval = setInterval(this.pollTickers, this.config.pollCheckFrequency);
    } else {
      console.log("Tried to start when already polling...");
    }
  };

  this.stop = () => {
    if (this.interval != undefined) {
      clearInterval(this.interval);

      this.interval = undefined;
    }
  };

  this.getLastPollById = (id) => {
    let lastPoll = this.lastPolls.filter((lp) => {
      return lp.id === id;
    });

    if (lastPoll === undefined || lastPoll.length === 0) {
      lastPoll = {
        "id": id,
        "time": 0
      };

      this.lastPolls.push(lastPoll);
    } else {
      lastPoll = lastPoll[0];
    }

    return lastPoll;
  };

  this.pollTickers = () => {
    let cmc = this;

    cmc.pollingIds.forEach((pollingId) => {
      if (cmc.tooManyPolls(pollingId)) {
        return;
      }

      let lastPoll = cmc.getLastPollById(pollingId);

      let timeSinceLastPoll = cmc.getTime() - lastPoll.time;

      if (cmc.getTime() - lastPoll.time > cmc.config.pollCheckFrequency) {
        cmc.pollTicker(pollingId);
      }
    });
  };

  this.pollTicker = (id) => {
    let cmc = this;
    console.log("Polling " + id);

    this.lastPolls.forEach((lp) => {
      if (lp.id === id) {
        lp.time = cmc.getTime();

        cmc.shortTermPollHistory.push(lp.time);
      }
    });
  };
};

module.exports = LibAPIRegulation;
