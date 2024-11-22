package sql

import (
	"fmt"
	"strings"

	"github.com/JeonggukLee/mock-data-generator/ddl"
)

func Generate(table ddl.Table, data map[string]string) (string, string, string) {
	names := make([]string, 0, len(table.Columns))
	values := make([]string, 0, len(table.Columns))

	for _, col := range table.Columns {
		names = append(names, col.Name)
		values = append(values, data[col.Name])
	}

	columns := fmt.Sprintf("%s", strings.Join(names, ","))
	mockValues := strings.ReplaceAll(fmt.Sprintf("%s", strings.Join(values, ",")), "'", "")

	return table.Name, columns, mockValues
}
