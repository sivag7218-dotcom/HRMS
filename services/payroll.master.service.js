// Payroll Master Service
// Handles business logic for salary components, templates, and structures

const { db } = require('../config/database');

// --- Salary Components (within a structure) ---
// Note: salary_components are linked to salary_structures, not standalone
exports.listComponents = async (req, res) => {
  try {
    const c = await db();
    const structureId = req.query.structure_id;
    let query = 'SELECT * FROM salary_components';
    let params = [];
    if (structureId) {
      query += ' WHERE structure_id = ?';
      params.push(structureId);
    }
    query += ' ORDER BY sequence ASC';
    const [rows] = await c.query(query, params);
    c.end();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createComponent = async (req, res) => {
  try {
    const c = await db();
    const { structure_id, code, name, component_type, calculation_type, value, percentage_of_code, taxable, prorated, sequence, notes } = req.body;
    
    // Validate required fields
    if (!structure_id || !code || !name || !component_type || !calculation_type || value === undefined) {
      c.end();
      return res.status(400).json({ error: 'structure_id, code, name, component_type, calculation_type, and value are required' });
    }

    const [result] = await c.query(
      `INSERT INTO salary_components (structure_id, code, name, component_type, calculation_type, value, percentage_of_code, taxable, prorated, sequence, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [structure_id, code, name, component_type || 'EARNING', calculation_type || 'FIXED', value, percentage_of_code || null, taxable !== false ? 1 : 0, prorated ? 1 : 0, sequence || 10, notes || null]
    );
    c.end();
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getComponent = async (req, res) => {
  try {
    const c = await db();
    const [rows] = await c.query('SELECT * FROM salary_components WHERE id = ?', [req.params.component_id]);
    c.end();
    if (rows.length === 0) return res.status(404).json({ error: 'Component not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateComponent = async (req, res) => {
  try {
    const c = await db();
    const { code, name, component_type, calculation_type, value, percentage_of_code, taxable, prorated, sequence, notes } = req.body;
    const [result] = await c.query(
      `UPDATE salary_components SET code=?, name=?, component_type=?, calculation_type=?, value=?, percentage_of_code=?, taxable=?, prorated=?, sequence=?, notes=?, updated_at=NOW() WHERE id=?`,
      [code, name, component_type, calculation_type, value, percentage_of_code, taxable ? 1 : 0, prorated ? 1 : 0, sequence, notes, req.params.component_id]
    );
    c.end();
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteComponent = async (req, res) => {
  try {
    const c = await db();
    const [result] = await c.query('DELETE FROM salary_components WHERE id = ?', [req.params.component_id]);
    c.end();
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
    const employeeId = req.query.employee_id;
    let query = 'SELECT s.*, e.EmployeeNumber, e.FullName FROM salary_structures s LEFT JOIN employees e ON e.id = s.employee_id';
    let params = [];
    if (employeeId) {
      query += ' WHERE s.employee_id = ?';
      params.push(employeeId);
    }
    query += ' ORDER BY s.effective_from DESC, s.version DESC';
    const [rows] = await c.query(query, params);
    c.end();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createStructure = async (req, res) => {
  try {
    const c = await db();
    const { employee_id, structure_name, ctc_amount, effective_from, effective_to, is_active, notes, created_by, components } = req.body;
    
    // Validate required fields
    if (!employee_id || !structure_name || !ctc_amount || !effective_from) {
      c.end();
      return res.status(400).json({ error: 'employee_id, structure_name, ctc_amount, and effective_from are required' });
    }

    await c.beginTransaction();
    
    try {
      // Get next version number for this employee
      const [versionRows] = await c.query(
        'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM salary_structures WHERE employee_id = ?',
        [employee_id]
      );
      const version = versionRows[0].next_version;

      // Insert structure
      const [result] = await c.query(
        `INSERT INTO salary_structures (employee_id, structure_name, ctc_amount, effective_from, effective_to, is_active, version, created_by, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [employee_id, structure_name, ctc_amount, effective_from, effective_to || null, is_active !== false ? 1 : 0, version, created_by || null, notes || null]
      );
      
      const structureId = result.insertId;

      // Insert components if provided
      if (components && Array.isArray(components)) {
        for (const comp of components) {
          await c.query(
            `INSERT INTO salary_components (structure_id, code, name, component_type, calculation_type, value, percentage_of_code, taxable, prorated, sequence, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              structureId, 
              comp.code, 
              comp.name, 
              comp.component_type || 'EARNING', 
              comp.calculation_type || 'FIXED', 
              comp.value, 
              comp.percentage_of_code || null, 
              comp.taxable !== false ? 1 : 0, 
              comp.prorated ? 1 : 0, 
              comp.sequence || 10, 
              comp.notes || null
            ]
          );
        }
      }

      await c.commit();
      c.end();
      res.json({ success: true, id: structureId, version });
    } catch (err) {
      await c.rollback();
      c.end();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStructure = async (req, res) => {
  try {
    const c = await db();
    const [structRows] = await c.query(
      'SELECT s.*, e.EmployeeNumber, e.FullName FROM salary_structures s LEFT JOIN employees e ON e.id = s.employee_id WHERE s.id = ?', 
      [req.params.id]
    );
    if (structRows.length === 0) {
      c.end();
      return res.status(404).json({ error: 'Structure not found' });
    }
    
    const structure = structRows[0];
    const [components] = await c.query('SELECT * FROM salary_components WHERE structure_id = ? ORDER BY sequence ASC', [structure.id]);
    c.end();
    
    res.json({ structure, components });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateStructure = async (req, res) => {
  try {
    const c = await db();
    const { structure_name, ctc_amount, effective_from, effective_to, is_active, notes } = req.body;
    const [result] = await c.query(
      `UPDATE salary_structures SET structure_name=?, ctc_amount=?, effective_from=?, effective_to=?, is_active=?, notes=?, updated_at=NOW() WHERE id=?`,
      [structure_name, ctc_amount, effective_from, effective_to, is_active ? 1 : 0, notes, req.params.id]
    );
    c.end();
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteStructure = async (req, res) => {
  try {
    const c = await db();
    // This will cascade delete components due to FK constraint
    const [result] = await c.query('DELETE FROM salary_structures WHERE id = ?', [req.params.id]);
    c.end();
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// --- Structure Composition (template-component mapping) ---
exports.listComposition = async (req, res) => {
  try {
    const c = await db();
    const [rows] = await c.query('SELECT * FROM structure_composition WHERE template_id = ?', [req.params.template_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.addComposition = async (req, res) => {
  try {
    const c = await db();
    const { component_id, formula_or_value, created_by } = req.body;
    const [result] = await c.query(
      'INSERT INTO structure_composition (template_id, component_id, formula_or_value, created_by) VALUES (?, ?, ?, ?)',
      [req.params.template_id, component_id, formula_or_value, created_by]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updateComposition = async (req, res) => {
  try {
    const c = await db();
    const { formula_or_value } = req.body;
    const [result] = await c.query(
      'UPDATE structure_composition SET formula_or_value=? WHERE composition_id=? AND template_id=?',
      [formula_or_value, req.params.composition_id, req.params.template_id]
    );
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.deleteComposition = async (req, res) => {
  try {
    const c = await db();
    const [result] = await c.query('DELETE FROM structure_composition WHERE composition_id = ? AND template_id = ?', [req.params.composition_id, req.params.template_id]);
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Populate Default Master Data ---
exports.populateDefaults = async (req, res) => {
  try {
    const c = await db();
    await c.beginTransaction();
    
    try {
      const createdBy = (req.user && req.user.id) || 1;
      const results = {
        templates: [],
        master_structures: [],
        employee_structures: [],
        components_created: 0,
        compositions_created: 0,
        message: ''
      };

      // Define default salary structure templates
      const defaultTemplates = [
        {
          name: 'Standard Employee Package',
          description: 'Standard salary structure for regular employees with basic components',
          ctc: 500000,
          components: [
            { code: 'BASIC', name: 'Basic Salary', type: 'EARNING', calc: 'PERCENTAGE', value: 40.00, seq: 10 },
            { code: 'HRA', name: 'House Rent Allowance', type: 'EARNING', calc: 'PERCENTAGE', value: 20.00, pct_of: 'BASIC', seq: 20 },
            { code: 'CONVEYANCE', name: 'Conveyance Allowance', type: 'EARNING', calc: 'FIXED', value: 1600.00, seq: 30 },
            { code: 'SPECIAL', name: 'Special Allowance', type: 'EARNING', calc: 'PERCENTAGE', value: 30.00, seq: 40 },
            { code: 'MEDICAL', name: 'Medical Allowance', type: 'EARNING', calc: 'FIXED', value: 1250.00, seq: 50 },
            { code: 'PF_DEDUCT', name: 'PF Employee Contribution', type: 'DEDUCTION', calc: 'PERCENTAGE', value: 12.00, pct_of: 'BASIC', seq: 100 }
          ]
        },
        {
          name: 'Senior Employee Package',
          description: 'Enhanced salary structure for senior employees with performance components',
          ctc: 800000,
          components: [
            { code: 'BASIC', name: 'Basic Salary', type: 'EARNING', calc: 'PERCENTAGE', value: 45.00, seq: 10 },
            { code: 'HRA', name: 'House Rent Allowance', type: 'EARNING', calc: 'PERCENTAGE', value: 25.00, pct_of: 'BASIC', seq: 20 },
            { code: 'CONVEYANCE', name: 'Conveyance Allowance', type: 'EARNING', calc: 'FIXED', value: 2400.00, seq: 30 },
            { code: 'SPECIAL', name: 'Special Allowance', type: 'EARNING', calc: 'PERCENTAGE', value: 25.00, seq: 40 },
            { code: 'MEDICAL', name: 'Medical Allowance', type: 'EARNING', calc: 'FIXED', value: 1500.00, seq: 50 },
            { code: 'PERFORMANCE', name: 'Performance Bonus', type: 'EARNING', calc: 'PERCENTAGE', value: 5.00, seq: 60 },
            { code: 'PF_DEDUCT', name: 'PF Employee Contribution', type: 'DEDUCTION', calc: 'PERCENTAGE', value: 12.00, pct_of: 'BASIC', seq: 100 }
          ]
        },
        {
          name: 'Manager Package',
          description: 'Comprehensive salary structure for managers with leadership bonuses',
          ctc: 1200000,
          components: [
            { code: 'BASIC', name: 'Basic Salary', type: 'EARNING', calc: 'PERCENTAGE', value: 50.00, seq: 10 },
            { code: 'HRA', name: 'House Rent Allowance', type: 'EARNING', calc: 'PERCENTAGE', value: 30.00, pct_of: 'BASIC', seq: 20 },
            { code: 'CONVEYANCE', name: 'Conveyance Allowance', type: 'EARNING', calc: 'FIXED', value: 3000.00, seq: 30 },
            { code: 'SPECIAL', name: 'Special Allowance', type: 'EARNING', calc: 'PERCENTAGE', value: 15.00, seq: 40 },
            { code: 'MEDICAL', name: 'Medical Allowance', type: 'EARNING', calc: 'FIXED', value: 2000.00, seq: 50 },
            { code: 'PERFORMANCE', name: 'Performance Bonus', type: 'EARNING', calc: 'PERCENTAGE', value: 5.00, seq: 60 },
            { code: 'PF_DEDUCT', name: 'PF Employee Contribution', type: 'DEDUCTION', calc: 'PERCENTAGE', value: 12.00, pct_of: 'BASIC', seq: 100 },
            { code: 'PROF_TAX', name: 'Professional Tax', type: 'DEDUCTION', calc: 'FIXED', value: 200.00, seq: 110 }
          ]
        }
      ];

      // Check if templates already exist
      const [existing] = await c.query('SELECT COUNT(*) as count FROM salary_structure_templates');
      
      if (existing[0].count > 0) {
        await c.rollback();
        c.end();
        return res.status(400).json({ 
          error: 'Default templates already exist. Clear existing templates first.',
          existing_count: existing[0].count 
        });
      }

      // Get admin user ID for master structures (use first admin user, or create a system user concept)
      const [adminUser] = await c.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
      const masterUserId = adminUser.length > 0 ? adminUser[0].id : 1; // Fallback to 1

      // STEP 1: Create master structures (template structures to hold component definitions)
      // These act as master component repositories that can be referenced
      for (const template of defaultTemplates) {
        // Get next version number for master user
        const [versionRows] = await c.query(
          'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM salary_structures WHERE employee_id = ?',
          [masterUserId]
        );
        const masterVersion = versionRows[0].next_version;
        
        // Create a master structure for this template (using admin/system user)
        const [masterStructResult] = await c.query(
          `INSERT INTO salary_structures (employee_id, structure_name, ctc_amount, effective_from, is_active, version, notes, created_by) 
           VALUES (?, ?, ?, CURDATE(), 0, ?, 'MASTER TEMPLATE - Do not modify. Used as component repository for template.', ?)`,
          [masterUserId, `MASTER_${template.name}`, template.ctc, masterVersion, createdBy]
        );
        
        const masterStructId = masterStructResult.insertId;
        results.master_structures.push({
          id: masterStructId,
          name: template.name
        });

        // Create master components for this structure
        const componentIds = [];
        for (const comp of template.components) {
          const [compResult] = await c.query(
            `INSERT INTO salary_components (structure_id, code, name, component_type, calculation_type, value, percentage_of_code, taxable, prorated, sequence, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              masterStructId,
              comp.code,
              comp.name,
              comp.type,
              comp.calc,
              comp.value,
              comp.pct_of || null,
              comp.type === 'EARNING' ? 1 : 0,
              0,
              comp.seq,
              'Master component definition'
            ]
          );
          componentIds.push({ id: compResult.insertId, ...comp });
          results.components_created++;
        }

        // STEP 2: Create template
        const [templateResult] = await c.query(
          'INSERT INTO salary_structure_templates (template_name, description, created_by) VALUES (?, ?, ?)',
          [template.name, template.description, createdBy]
        );
        
        const templateId = templateResult.insertId;
        results.templates.push({
          id: templateId,
          name: template.name,
          components: template.components.length,
          master_structure_id: masterStructId
        });

        // STEP 3: Create template composition (link components to template)
        for (const comp of componentIds) {
          const formula = comp.pct_of ? `${comp.value}% of ${comp.pct_of}` : `${comp.value}`;
          await c.query(
            'INSERT INTO structure_composition (template_id, component_id, formula_or_value, created_by) VALUES (?, ?, ?, ?)',
            [templateId, comp.id, formula, createdBy]
          );
          results.compositions_created++;
        }
      }

      // STEP 4: Get first 3-5 employees and create sample structures
      const [employees] = await c.query('SELECT id, FullName FROM employees WHERE EmploymentStatus = "Active" LIMIT 5');
      
      if (employees.length > 0) {
        for (let i = 0; i < Math.min(employees.length, 3); i++) {
          const emp = employees[i];
          const template = defaultTemplates[i % defaultTemplates.length]; // Rotate through templates
          const templateData = results.templates.find(t => t.name === template.name);
          
          // Get next version number for this employee
          const [empVersionRows] = await c.query(
            'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM salary_structures WHERE employee_id = ?',
            [emp.id]
          );
          const empVersion = empVersionRows[0].next_version;
          
          // Create employee structure
          const [empStructResult] = await c.query(
            `INSERT INTO salary_structures (employee_id, structure_name, ctc_amount, effective_from, is_active, version, notes, created_by) 
             VALUES (?, ?, ?, CURDATE(), 1, ?, ?, ?)`,
            [emp.id, `${emp.FullName} - ${template.name}`, template.ctc, empVersion, `Applied ${template.name} template`, createdBy]
          );
          
          const empStructId = empStructResult.insertId;
          
          // Copy components from master structure to employee structure
          for (const comp of template.components) {
            await c.query(
              `INSERT INTO salary_components (structure_id, code, name, component_type, calculation_type, value, percentage_of_code, taxable, prorated, sequence, notes) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                empStructId,
                comp.code,
                comp.name,
                comp.type,
                comp.calc,
                comp.value,
                comp.pct_of || null,
                comp.type === 'EARNING' ? 1 : 0,
                0,
                comp.seq,
                `From ${template.name} template`
              ]
            );
          }

          results.employee_structures.push({
            employee_id: emp.id,
            employee_name: emp.FullName,
            structure_id: empStructId,
            template: template.name,
            ctc: template.ctc
          });
        }
      }

      await c.commit();
      c.end();

      results.message = `Successfully created complete payroll master data`;
      
      res.json({
        success: true,
        summary: {
          templates: results.templates.length,
          components: results.components_created,
          compositions: results.compositions_created,
          employee_structures: results.employee_structures.length
        },
        templates: results.templates,
        employee_structures: results.employee_structures,
        message: results.message,
        note: 'Complete payroll setup ready. Templates, components, compositions, and sample employee structures created.',
        next_steps: [
          '1. Run payroll: POST /api/payroll/v2/run with year and month',
          '2. View payslips: GET /api/payroll/v2/payslips/{employeeId}',
          '3. Assign more employees: POST /api/payroll-master/structures'
        ]
      });
      
    } catch (err) {
      await c.rollback();
      c.end();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Clear All Master Data (for testing/reset) ---
exports.clearMasterData = async (req, res) => {
  try {
    const c = await db();
    await c.beginTransaction();
    
    try {
      // Delete in correct order to avoid FK constraints
      // 1. Delete structure composition first
      const [compResult] = await c.query('DELETE FROM structure_composition');
      
      // 2. Delete salary components (this includes both master and employee components)
      // Delete all components linked to any salary structures (will cascade from structure deletion)
      const [componentsResult] = await c.query('DELETE FROM salary_components');
      
      // 3. Delete salary structures (both master structures and employee structures created by auto-populate)
      // Delete all structures that were created by the populate defaults
      const [structuresResult] = await c.query(`DELETE FROM salary_structures WHERE 
        structure_name LIKE 'MASTER_%' OR 
        notes LIKE '%template%' OR 
        notes LIKE '%MASTER TEMPLATE%'`);
      
      // 4. Delete templates
      const [templateResult] = await c.query('DELETE FROM salary_structure_templates');
      
      await c.commit();
      c.end();
      
      res.json({
        success: true,
        message: 'All payroll master data cleared successfully',
        deleted: {
          templates: templateResult.affectedRows,
          structures: structuresResult.affectedRows,
          components: componentsResult.affectedRows,
          compositions: compResult.affectedRows
        }
      });
    } catch (err) {
      await c.rollback();
      c.end();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
