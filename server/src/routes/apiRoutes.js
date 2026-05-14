const express = require('express');

const { analyze } = require('../controllers/aiController');
const { createAdvisory } = require('../controllers/advisoryController');
const { getData } = require('../controllers/dataController');
const { clearSystem, createIncident } = require('../controllers/incidentController');
const { createUnit, deployUnit } = require('../controllers/unitController');
const { aiLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/analyze', aiLimiter, analyze);
router.get('/data', getData);
router.post('/units', createUnit);
router.post('/deploy', deployUnit);
router.post('/incident', createIncident);
router.post('/advisory', createAdvisory);
router.delete('/clear', clearSystem);

module.exports = router;
