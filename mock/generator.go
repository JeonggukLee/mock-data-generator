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
		case col.DataType == "boolean":
			data[col.Name] = fmt.Sprintf("'%d'", r.Intn(2))
		case col.DataType == "char":
			length := extractLength(col.DataSize)
			data[col.Name] = fmt.Sprintf("'%s'", randomString(r, length))
		case strings.Contains("varchar|text", col.DataType):
			length := extractLength(col.DataSize)
			if length == 0 {
				length = 50 // Default size is 1GB, but here we set it to 50 length.
			}
			data[col.Name] = fmt.Sprintf("'%s'", randomString(r, length))
		case strings.Contains("smallint", col.DataType):
			data[col.Name] = fmt.Sprintf("%d", randomInt(r, 32767))
		case strings.Contains("int|integer", col.DataType):
			data[col.Name] = fmt.Sprintf("%d", randomInt(r, 2147483647))
		case strings.Contains("bigint|real", col.DataType):
			// Not max of data type and real type matches the maximum of bigint type
			data[col.Name] = fmt.Sprintf("%d", randomInt(r, 10000000000000))
		case strings.Contains("decimal|numeric", col.DataType):
			// Not max of data type
			data[col.Name] = randomValueFromDataSize(col.DataSize)
		case col.DataType == "timestamp":
			data[col.Name] = randomTimestamp(r)
		case col.DataType == "date":
			data[col.Name] = randomDate(r)
		case col.DataType == "serial":
			data[col.Name] = fmt.Sprintf("%d", r.Intn(2147483647)+1)
		default:
			data[col.Name] = "'UNKNOWN'"
		}
	}
	return data
}

func extractLength(dataSize ddl.DataSize) int {
	len := 0
	if dataSize.Precision != "" {
		len, err := strconv.Atoi(dataSize.Precision)
		if err == nil {
			return len
		}
	}
	return len
}

func randomValueFromDataSize(dataSize ddl.DataSize) string {
	// create seed
	rand.New(rand.NewSource(time.Now().UnixNano()))
	precisionInt, _ := strconv.Atoi(dataSize.Precision)
	scaleInt, _ := strconv.Atoi(dataSize.Scale)
	// check size
	if precisionInt < scaleInt {
		return "Error: Percision must be greater than or equal to Scale"
	}

	// 整数部の桁数を計算
	integerDigits := precisionInt - scaleInt

	// 整数部のランダム値を生成
	integerPart := strconv.Itoa(rand.Intn(int(pow10(integerDigits))))

	// スケールが0より大きい場合、小数部のランダム値を生成
	var decimalPart string
	if scaleInt > 0 {
		decimalPart = strconv.Itoa(rand.Intn(int(pow10(scaleInt))))
	}

	// Left pad with zeroes if necessary
	integerPart = strings.Repeat("0", integerDigits-len(integerPart)) + integerPart
	decimalPart = strings.Repeat("0", scaleInt-len(decimalPart)) + decimalPart

	if scaleInt > 0 {
		return integerPart + "." + decimalPart
	} else {
		return integerPart
	}
}

func pow10(n int) int64 {
	p := int64(1)
	for i := 0; i < n; i++ {
		p *= 10
	}
	return p
}

func randomInt(r *rand.Rand, max int) int {
	rand.New(rand.NewSource(time.Now().UnixNano()))
	min := -(max + 1)
	randomValue := rand.Intn(max-min) + min
	return randomValue
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
	return fmt.Sprintf("%s %s", randomDate(r), randTime.Format("'15:04:05'"))
}
