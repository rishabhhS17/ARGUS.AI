const express = require('express');

const { analyze } = require('../controllers/aiController');
const { createAdvisory } = require('../controllers/advisoryController');
const { getData } = require('../controllers/dataController');
const { clearSystem, ingestIncident } = require('../controllers/incidentController');
const { createUnit, deployUnit, getDispatchSuggestions } = require('../controllers/unitController');
const { aiLimiter, pollLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

// Citizen reports: analyze -> validate -> correlate, all server-side.
router.post('/ingest', aiLimiter, ingestIncident);
// Operator tools
router.post('/analyze', aiLimiter, analyze); // advisory drafting
router.get('/data', pollLimiter, getData);
router.get('/incidents/:id/suggestions', getDispatchSuggestions);
router.post('/units', createUnit);
router.post('/deploy', deployUnit);
router.post('/advisory', createAdvisory);
router.delete('/clear', clearSystem);

module.exports = router;
