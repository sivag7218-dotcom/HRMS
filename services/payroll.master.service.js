// Payroll Master Service
// Handles business logic for salary components, templates, and structures

const db = require('../config/database');

// --- Salary Components ---
exports.listComponents = async (req, res) => {
  try {
    const c = await db();
    const [rows] = await c.query('SELECT * FROM salary_components');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.createComponent = async (req, res) => {
  try {
    const c = await db();
    const { name, type, is_statutory, is_taxable, calculation_type, created_by } = req.body;
    const [result] = await c.query(
      'INSERT INTO salary_components (name, type, is_statutory, is_taxable, calculation_type, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [name, type, is_statutory, is_taxable, calculation_type, created_by]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getComponent = async (req, res) => {
  try {
    const c = await db();
    const [rows] = await c.query('SELECT * FROM salary_components WHERE component_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updateComponent = async (req, res) => {
  try {
    const c = await db();
    const { name, type, is_statutory, is_taxable, calculation_type } = req.body;
    const [result] = await c.query(
      'UPDATE salary_components SET name=?, type=?, is_statutory=?, is_taxable=?, calculation_type=? WHERE component_id=?',
      [name, type, is_statutory, is_taxable, calculation_type, req.params.id]
    );
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.deleteComponent = async (req, res) => {
  try {
    const c = await db();
    const [result] = await c.query('DELETE FROM salary_components WHERE component_id = ?', [req.params.id]);
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Salary Templates ---
exports.listTemplates = async (req, res) => {
  try {
    const c = await db();
    const [rows] = await c.query('SELECT * FROM salary_structure_templates');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.createTemplate = async (req, res) => {
  try {
    const c = await db();
    const { template_name, description, created_by } = req.body;
    const [result] = await c.query(
      'INSERT INTO salary_structure_templates (template_name, description, created_by) VALUES (?, ?, ?)',
      [template_name, description, created_by]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getTemplate = async (req, res) => {
  try {
    const c = await db();
    const [rows] = await c.query('SELECT * FROM salary_structure_templates WHERE template_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updateTemplate = async (req, res) => {
  try {
    const c = await db();
    const { template_name, description } = req.body;
    const [result] = await c.query(
      'UPDATE salary_structure_templates SET template_name=?, description=? WHERE template_id=?',
      [template_name, description, req.params.id]
    );
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.deleteTemplate = async (req, res) => {
  try {
    const c = await db();
    const [result] = await c.query('DELETE FROM salary_structure_templates WHERE template_id = ?', [req.params.id]);
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Salary Structures ---
exports.listStructures = async (req, res) => {
  try {
    const c = await db();
    const [rows] = await c.query('SELECT * FROM salary_structures');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.createStructure = async (req, res) => {
  try {
    const c = await db();
    const { employee_id, component_name, component_value } = req.body;
    const [result] = await c.query(
      'INSERT INTO salary_structures (employee_id, component_name, component_value) VALUES (?, ?, ?)',
      [employee_id, component_name, component_value]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getStructure = async (req, res) => {
  try {
    const c = await db();
    const [rows] = await c.query('SELECT * FROM salary_structures WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updateStructure = async (req, res) => {
  try {
    const c = await db();
    const { component_name, component_value } = req.body;
    const [result] = await c.query(
      'UPDATE salary_structures SET component_name=?, component_value=? WHERE id=?',
      [component_name, component_value, req.params.id]
    );
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.deleteStructure = async (req, res) => {
  try {
    const c = await db();
    const [result] = await c.query('DELETE FROM salary_structures WHERE id = ?', [req.params.id]);
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
