// Payroll Master Controller
// Handles CRUD for salary components, templates, and structures

const payrollMasterService = require('../services/payroll.master.service');

// Salary Components
exports.listComponents = (req, res) => payrollMasterService.listComponents(req, res);
exports.createComponent = (req, res) => payrollMasterService.createComponent(req, res);
exports.getComponent = (req, res) => payrollMasterService.getComponent(req, res);
exports.updateComponent = (req, res) => payrollMasterService.updateComponent(req, res);
exports.deleteComponent = (req, res) => payrollMasterService.deleteComponent(req, res);

// Salary Templates
exports.listTemplates = (req, res) => payrollMasterService.listTemplates(req, res);
exports.createTemplate = (req, res) => payrollMasterService.createTemplate(req, res);
exports.getTemplate = (req, res) => payrollMasterService.getTemplate(req, res);
exports.updateTemplate = (req, res) => payrollMasterService.updateTemplate(req, res);
exports.deleteTemplate = (req, res) => payrollMasterService.deleteTemplate(req, res);

// Salary Structures
exports.listStructures = (req, res) => payrollMasterService.listStructures(req, res);
exports.createStructure = (req, res) => payrollMasterService.createStructure(req, res);
exports.getStructure = (req, res) => payrollMasterService.getStructure(req, res);
exports.updateStructure = (req, res) => payrollMasterService.updateStructure(req, res);
exports.deleteStructure = (req, res) => payrollMasterService.deleteStructure(req, res);

// Structure Composition (template-component mapping)
exports.listComposition = (req, res) => payrollMasterService.listComposition(req, res);
exports.addComposition = (req, res) => payrollMasterService.addComposition(req, res);
exports.updateComposition = (req, res) => payrollMasterService.updateComposition(req, res);
exports.deleteComposition = (req, res) => payrollMasterService.deleteComposition(req, res);
