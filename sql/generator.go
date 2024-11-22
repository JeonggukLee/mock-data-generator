package sql

import (
	"fmt"
	"strings"

	"github.com/JeonggukLee/mock-data-generator/ddl"
)

func Generate(table ddl.Table, data map[string]string) (string, string) {
	names := make([]string, 0, len(table.Columns))
	values := make([]string, 0, len(table.Columns))
	updateSets := make([]string, 0, len(table.Columns))

	for _, col := range table.Columns {
		names = append(names, col.Name)
		values = append(values, data[col.Name])
		updateSets = append(updateSets, fmt.Sprintf("%s=%s", col.Name, data[col.Name]))
	}

	insertSQL := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s);",
		table.Name, strings.Join(names, ", "), strings.Join(values, ", "))

	updateSQL := fmt.Sprintf("UPDATE %s SET %s WHERE <condition>;",
		table.Name, strings.Join(updateSets, ", "))

	return insertSQL, updateSQL
}
