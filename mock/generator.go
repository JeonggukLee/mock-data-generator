package mock

import (
	"fmt"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"github.com/JeonggukLee/mock-data-generator/ddl"
)

func Generate(columns []ddl.Column) map[string]string {
	data := make(map[string]string)
	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	for _, col := range columns {
		switch {
		case strings.HasPrefix(col.DataType, "varchar"):
			length := extractLength(col.DataType)
			if length == 0 {
				length = 10
			}
			data[col.Name] = fmt.Sprintf("'%s'", randomString(r, length))
		case strings.HasPrefix(col.DataType, "char"):
			length := extractLength(col.DataType)
			data[col.Name] = fmt.Sprintf("'%s'", randomString(r, length))
		case strings.Contains(col.DataType, "int"):
			data[col.Name] = fmt.Sprintf("%d", r.Intn(1000000000))
		case strings.Contains(col.DataType, "numeric") || strings.Contains(col.DataType, "decimal"):
			data[col.Name] = fmt.Sprintf("%d.%d", r.Int63n(1000000), r.Intn(1000))
		case strings.Contains(col.DataType, "timestamp"):
			data[col.Name] = randomTimestamp(r)
		case strings.Contains(col.DataType, "date"):
			data[col.Name] = randomDate(r)
		default:
			data[col.Name] = "'UNKNOWN'"
		}
	}
	return data
}

func extractLength(dataType string) int {
	start := strings.Index(dataType, "(")
	end := strings.Index(dataType, ")")
	if start != -1 && end != -1 && start < end {
		lengthStr := dataType[start+1 : end]
		length, err := strconv.Atoi(lengthStr)
		if err == nil {
			return length
		}
	}
	return 0
}

func randomString(r *rand.Rand, length int) string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[r.Intn(len(charset))]
	}
	return string(b)
}

func randomDate(r *rand.Rand) string {
	now := time.Now().UTC()
	year := now.Year()
	month := r.Intn(12) + 1
	day := r.Intn(28) + 1
	return fmt.Sprintf("'%04d-%02d-%02d'", year, month, day)
}

func randomTimestamp(r *rand.Rand) string {
	now := time.Now().UTC()
	randTime := now.Add(time.Duration(r.Intn(1000000)) * time.Hour)
	return randTime.Format("'2006-01-02 15:04:05'")
}
