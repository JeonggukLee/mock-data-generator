package ddl

// Table holds table information
type Table struct {
	Name    string
	Columns []Column
}

// Column holds column information
type Column struct {
	Name     string
	DataType string
	DataSize DataSize
}

type DataSize struct {
	Precision string
	Scale     string
}
