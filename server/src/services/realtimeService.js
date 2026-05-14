let io = null;

function attachRealtimeServer(server) {
  io = server;
}

function emitIncidentAlert(payload) {
  if (io) {
    io.emit('incident_alert', payload);
  }
}

function emitUnitsUpdated(units) {
  if (io) {
    io.emit('units_updated', units);
  }
}

function emitAdvisoryPosted(advisory) {
  if (io) {
    io.emit('advisory_posted', advisory);
  }
}

function emitAdvisoriesCleared() {
  if (io) {
    io.emit('advisories_cleared');
  }
}

module.exports = {
  attachRealtimeServer,
  emitAdvisoriesCleared,
  emitAdvisoryPosted,
  emitIncidentAlert,
  emitUnitsUpdated,
};
