// Payroll Master Routes
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payroll.master.controller');

// Default Master Data Setup
router.post('/setup/defaults', ctrl.populateDefaults);
router.delete('/setup/clear', ctrl.clearMasterData);

// Salary Components
router.get('/components', ctrl.listComponents);
router.post('/components', ctrl.createComponent);
router.get('/components/:component_id', ctrl.getComponent);
router.put('/components/:component_id', ctrl.updateComponent);
router.delete('/components/:component_id', ctrl.deleteComponent);

// Salary Templates
router.get('/templates', ctrl.listTemplates);
router.post('/templates', ctrl.createTemplate);
router.get('/templates/:id', ctrl.getTemplate);
router.put('/templates/:id', ctrl.updateTemplate);
router.delete('/templates/:id', ctrl.deleteTemplate);

// Salary Structures
router.get('/structures', ctrl.listStructures);
router.post('/structures', ctrl.createStructure);
router.get('/structures/:id', ctrl.getStructure);
router.put('/structures/:id', ctrl.updateStructure);
router.delete('/structures/:id', ctrl.deleteStructure);

// Structure Composition (template-component mapping)
router.get('/templates/:template_id/composition', ctrl.listComposition);
router.post('/templates/:template_id/composition', ctrl.addComposition);
router.put('/templates/:template_id/composition/:composition_id', ctrl.updateComposition);
router.delete('/templates/:template_id/composition/:composition_id', ctrl.deleteComposition);

module.exports = router;
