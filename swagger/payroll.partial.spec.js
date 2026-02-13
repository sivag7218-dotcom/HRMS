module.exports = {
  paths: {
    "/api/payroll/v2/run": {
      post: {
        summary: "Run payroll for a month (v2)",
        tags: ["Payroll"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  year: { type: "integer", example: 2026 },
                  month: { type: "integer", example: 2 }
                },
                required: ["year", "month"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Payroll run initiated/completed",
            content: {
              "application/json": {
                example: {
                  success: true,
                  result: { runId: 1, cycleId: 2, totalEmployees: 2, totalGross: 12345.67 }
                }
              }
            }
          }
        }
      }
    },
    "/api/payroll/v2/payslips/{employeeId}": {
      get: {
        summary: "Get payslip list for an employee (v2)",
        tags: ["Payroll"],
        parameters: [
          { name: "employeeId", in: "path", required: true, schema: { type: "integer" } }
        ],
        responses: {
          200: { description: "List of payslips" }
        }
      }
    },
    "/api/payroll/v2/payslips/{employeeId}/{year}/{month}": {
      get: {
        summary: "Get payslip detail for employee for a month (v2)",
        tags: ["Payroll"],
        parameters: [
          { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
          { name: "year", in: "path", required: true, schema: { type: "integer" } },
          { name: "month", in: "path", required: true, schema: { type: "integer" } }
        ],
        responses: { 200: { description: "Payslip detail" }, 404: { description: "Not found" } }
      }
    },
    "/api/payroll/v2/structure/{employeeId}": {
      get: {
        summary: "Get salary structure for employee (v2)",
        tags: ["Payroll"],
        parameters: [
          { name: "employeeId", in: "path", required: true, schema: { type: "integer" } }
        ],
        responses: { 200: { description: "Salary structure and components" }, 404: { description: "Not found" } }
      }
    },
    "/api/payroll/v2/attendance-impact/{employeeId}": {
      get: {
        summary: "Get attendance impact for payroll (v2)",
        tags: ["Payroll"],
        parameters: [
          { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
          { name: "year", in: "query", required: true, schema: { type: "integer" } },
          { name: "month", in: "query", required: true, schema: { type: "integer" } }
        ],
        responses: { 200: { description: "Attendance impact" } }
      }
    }
  }
  ,
  "/api/payroll/v2/run": {
    get: {
      summary: "Get payroll run summary for a month (v2)",
      tags: ["Payroll"],
      parameters: [
        { name: "month", in: "query", required: true, schema: { type: "string", example: "2026-02" }, description: "Month in YYYY-MM" }
      ],
      responses: { 200: { description: "Run summary list" } }
    }
  },
  "/api/payroll/v2/run/{employeeId}": {
    get: {
      summary: "Get employee-level payroll breakup for a month",
      tags: ["Payroll"],
      parameters: [
        { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
        { name: "month", in: "query", required: true, schema: { type: "string", example: "2026-02" } }
      ],
      responses: { 200: { description: "Employee payroll breakup" } }
    }
  },
  "/api/payroll/v2/earnings/{employeeId}": {
    get: {
      summary: "Get earnings for employee (v2)",
      tags: ["Payroll"],
      parameters: [
        { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
        { name: "month", in: "query", required: true, schema: { type: "string", example: "2026-02" } }
      ],
      responses: { 200: { description: "Earnings lines" } }
    }
  },
  "/api/payroll/v2/deductions/{employeeId}": {
    get: {
      summary: "Get deductions for employee (v2)",
      tags: ["Payroll"],
      parameters: [
        { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
        { name: "month", in: "query", required: true, schema: { type: "string", example: "2026-02" } }
      ],
      responses: { 200: { description: "Deduction lines" } }
    }
  },
  "/api/payroll/v2/tax-summary/{employeeId}": {
    get: {
      summary: "Get yearly tax summary for employee (v2)",
      tags: ["Payroll"],
      parameters: [
        { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
        { name: "year", in: "query", required: true, schema: { type: "integer", example: 2026 } }
      ],
      responses: { 200: { description: "Tax summary" } }
    }
  },
  "/api/payroll/v2/form16/{employeeId}": {
    get: {
      summary: "Get Form16 metadata for employee (v2)",
      tags: ["Payroll"],
      parameters: [
        { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
        { name: "year", in: "query", required: true, schema: { type: "integer", example: 2026 } }
      ],
      responses: { 200: { description: "Form16 metadata or availability" } }
    }
  },
  "/api/payroll/v2/form16/{employeeId}/{year}/download": {
    get: {
      summary: "Download Form16 PDF (v2)",
      tags: ["Payroll"],
      parameters: [
        { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
        { name: "year", in: "path", required: true, schema: { type: "integer", example: 2026 } }
      ],
      responses: { 200: { description: "PDF binary" }, 501: { description: "Not implemented" } }
    }
  },
  "/api/payroll/v2/payslips/{employeeId}/{month}": {
    get: {
      summary: "Get payslip for employee for a month (YYYY-MM)",
      tags: ["Payroll"],
      parameters: [
        { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
        { name: "month", in: "path", required: true, schema: { type: "string", example: "2026-02" } }
      ],
      responses: { 200: { description: "Payslip" }, 404: { description: "Not found" } }
    }
  }
};
