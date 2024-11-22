package ddl

import (
	"fmt"
	"strings"
)

// RemoveInlineComments removes inline comments (/* */, --, //) from ddl
func RemoveInlineComments(ddl string) string {
	// Remove /* ... */
	for {
		start := strings.Index(ddl, "/*")
		if start == -1 {
			break
		}
		end := strings.Index(ddl[start:], "*/")
		if end == -1 {
			break
		}
		ddl = ddl[:start] + ddl[start+end+2:]
	}
	// Remove -- and //
	lines := strings.Split(ddl, "\n")
	for i, line := range lines {
		if idx := strings.Index(line, "--"); idx != -1 {
			line = line[:idx]
		}
		if idx := strings.Index(line, "//"); idx != -1 {
			line = line[:idx]
		}
		lines[i] = line
	}
	return strings.Join(lines, "\n")
}

// RemoveEmptyLines removes empty lines from a string
func RemoveEmptyLines(ddl string) string {
	lines := strings.Split(ddl, "\n")
	var nonEmptyLines []string
	for _, line := range lines {
		if strings.TrimSpace(line) != "" {
			nonEmptyLines = append(nonEmptyLines, line)
		}
	}
	return strings.Join(nonEmptyLines, "\n")
}

// ReformatDDL reformats DDL to ensure "create table" statement is on one line
func ReformatDDL(ddl string) string {
	ddl = strings.ReplaceAll(ddl, "\n", " ")
	ddl = strings.ReplaceAll(ddl, "\t", " ")
	ddl = strings.ReplaceAll(ddl, "\r", " ")
	return ddl
}

// Parse parses DDL and extracts table name and columns
func Parse(ddl string) (Table, error) {
	ddl = RemoveInlineComments(ddl)
	ddl = RemoveEmptyLines(ddl) // Remove empty lines

	// Reformat DDL to ensure "create table" statement is on one line
	ddl = ReformatDDL(ddl)

	lines := strings.Split(ddl, ";") // Split statements by semicolon
	var table Table
	var columnsStr string
	inColumns := false

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Handle create table statement
		if strings.HasPrefix(strings.ToLower(line), "create table") {
			parts := strings.Fields(line)
			if len(parts) < 3 {
				return table, fmt.Errorf("invalid DDL")
			}
			table.Name = parts[2] // Assuming "create table tableName ("
			inColumns = true
			columnsStr = line[strings.Index(line, "(")+1 : strings.LastIndex(line, ")")]
			break
		}
	}

	// Parse columns
	if inColumns {
		columnLines := strings.Split(columnsStr, ",")
		for _, colLine := range columnLines {
			colLine = strings.TrimSpace(colLine)
			parts := strings.Fields(colLine)
			if len(parts) < 2 {
				continue
			}
			column := Column{
				Name:     strings.Trim(parts[0], " ,"),
				DataType: strings.Trim(parts[1], " ,"),
			}
			table.Columns = append(table.Columns, column)
		}
	}

	if table.Name == "" {
		return table, fmt.Errorf("table name not found in DDL")
	}
	if len(table.Columns) == 0 {
		return table, fmt.Errorf("no columns found in DDL")
	}

	return table, nil
}
