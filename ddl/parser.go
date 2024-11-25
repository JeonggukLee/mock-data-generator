package ddl

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"
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
	ddl = RemoveInlineComments(ddl) // Remove comment
	ddl = RemoveEmptyLines(ddl)     // Remove empty lines
	ddl = ReformatDDL(ddl)          // Reformat DDL to ensure "create table" statement is on one line

	lines := strings.Split(ddl, ";") // Split statements by semicolon
	// Regex pattern for table name.
	const ddlPattern = `(?i)create[\s]+table[\s]+(\w+)[\s+]?\((.*)\)`
	var table Table
	var columnsStr string
	inColumns := false

	for _, line := range lines {
		line = strings.TrimSpace(line)
		// create table line match
		re := regexp.MustCompile(ddlPattern)
		matches := re.FindStringSubmatch(line)
		if line == "" || matches == nil {
			continue
		}
		inColumns = true

		// Handle create table statement
		var builder strings.Builder
		for idx, r := range []rune(matches[1]) {
			prefixStr := ""
			if idx != 0 && unicode.IsLetter(r) && unicode.IsUpper(r) {
				prefixStr = "_"
			}
			fmt.Fprintf(&builder, "%s%c", prefixStr, r)
		}
		table.Name = strings.ToLower(builder.String())
		columnsStr = strings.TrimSpace(matches[2])
		break
	}

	// Parse columns
	if inColumns {
		columnLines := splitIgnoringParentheses(columnsStr)
		for _, colLine := range columnLines {
			colLine = strings.TrimSpace(colLine)
			dataName, dataType, precision, scale := extractDataTypeDetails(colLine)
			column := Column{
				Name:     dataName,
				DataType: dataType,
				DataSize: DataSize{
					Precision: precision,
					Scale:     scale,
				},
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

// Split line by comma
func splitIgnoringParentheses(input string) []string {
	var result []string
	var currentPart strings.Builder
	depth := 0 // 括弧のネストレベルをカウントする

	for _, char := range input {
		if char == '(' {
			depth++
		} else if char == ')' {
			depth--
		}

		if char == ',' && depth == 0 {
			result = append(result, currentPart.String())
			currentPart.Reset()
		} else {
			currentPart.WriteRune(char)
		}
	}
	result = append(result, currentPart.String())

	return result
}

// Extracting data type details
func extractDataTypeDetails(input string) (dataName string, dataType string, precision string, scale string) {
	// Define regex pattern
	regexPattern := `(\w+)\s*(boolean|char|varchar|text|smallint|bigint|real|integer|decimal|numeric|double\s*precision|serial|time|timestamp|date)[\s]?[\(]?(\d*)[,\s]?(\d*)[\)]?`
	re := regexp.MustCompile(regexPattern)

	matches := re.FindStringSubmatch(input)
	if matches == nil {
		fmt.Printf("解析できない情報: %s\n", input)
		return
	}

	// extract type
	dataName = matches[1]
	dataType = matches[2]
	var prec, scl string
	if len(matches) > 4 && matches[3] != "" {
		prec = matches[3]
	}
	if len(matches) > 5 && matches[4] != "" {
		scl = matches[4]
	}
	precision = prec
	scale = scl
	return
}
