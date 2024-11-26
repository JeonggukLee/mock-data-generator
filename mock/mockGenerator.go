package mock

import (
	"fmt"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"github.com/JeonggukLee/mock-data-generator/ddl"
)

func MockGenerate(columns []ddl.Column) map[string]string {
	data := make(map[string]string)
	r := newRandomSeed()

	for _, col := range columns {
		switch {
		case col.DataType == "boolean":
			data[col.Name] = fmt.Sprintf("'%d'", r.Intn(2))
		case col.DataType == "serial":
			data[col.Name] = fmt.Sprintf("%d", r.Intn(2147483647)+1)
		case col.DataType == "char":
			length := extractLength(col.DataSize)
			data[col.Name] = fmt.Sprintf("'%s'", stringValue(length))
		case strings.Contains("varchar|text", col.DataType):
			length := extractLength(col.DataSize)
			data[col.Name] = fmt.Sprintf("'%s'", stringValue(length))
		case strings.Contains("smallint", col.DataType):
			data[col.Name] = fmt.Sprintf("%d", smallintValue())
		case strings.Contains("int|integer", col.DataType):
			data[col.Name] = fmt.Sprintf("%d", integerValue())
		case strings.Contains("bigint|real", col.DataType):
			data[col.Name] = fmt.Sprintf("%d", bigintValue())
		case strings.Contains("decimal|numeric", col.DataType):
			data[col.Name] = digitNumberWithSize(col.DataSize)
		case col.DataType == "timestamp":
			data[col.Name] = generateTimestamp(r)
		case col.DataType == "date":
			data[col.Name] = generateDate(r)
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

func newRandomSeed() *rand.Rand {
	return rand.New(rand.NewSource(time.Now().UnixNano()))
}

// Generate a smallint value (-32768 to 32767)
func smallintValue() int16 {
	return int16(newRandomSeed().Intn(65536) - 32768)
}

// Generate a integer value (-2147483648 to 2147483647)
func integerValue() int32 {
	return int32(newRandomSeed().Intn(int(1<<31)) + int(-1<<31))
}

// Generate a bigint value (-9223372036854775808 to 9223372036854775807)
func bigintValue() int64 {
	r := newRandomSeed()
	if newRandomSeed().Intn(2) == 0 {
		return r.Int63()
	} else {
		return -r.Int63() - 1
	}
}

// Generate a value with up to 'digits' digits
func digitNumber(digits int) int {
	if digits <= 0 {
		return 0
	}

	// 1 桁から指定桁数までの範囲で桁数をランダムに選択
	rng := newRandomSeed()
	numDigits := rng.Intn(digits) + 1

	// ランダムな数値の範囲を計算
	min := int64(1)
	max := int64(1)
	for i := 0; i < numDigits; i++ {
		max *= 10
		if i > 0 {
			min *= 10
		}
	}
	max-- // max は (10^numDigits) - 1

	// ランダムな数値を生成
	randomValue := min + rng.Int63n(max-min+1)

	return int(randomValue)
}

func digitNumberWithSize(dataSize ddl.DataSize) string {
	precisionInt, _ := strconv.Atoi(dataSize.Precision)
	scaleInt, _ := strconv.Atoi(dataSize.Scale)
	// check size
	if precisionInt < scaleInt {
		return "Error: Percision must be greater than or equal to Scale"
	}

	// 整数部桁数を計算
	integerDigits := precisionInt - scaleInt

	// 整数部と少数部のランダム値を生成する。スケールがゼロ以上の時のみ少数部を生成する.
	integerPart := strconv.Itoa(digitNumber(integerDigits))
	if scaleInt > 0 {
		return integerPart + "." + strconv.Itoa(digitNumber(scaleInt))
	} else {
		return integerPart
	}
}

func stringValue(length int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	if length == 0 {
		length = 50
	}
	// 1 から n までの範囲でランダムな長さを決定
	rng := newRandomSeed()
	randowmLen := rng.Intn(length) + 1
	b := make([]byte, randowmLen)

	size := len(letters)
	for i := range b {
		b[i] = letters[rng.Intn(size)]
	}
	return string(b)
}

func generateDate(r *rand.Rand) string {
	now := time.Now().UTC()
	year := now.Year()
	month := r.Intn(12) + 1
	day := r.Intn(28) + 1
	return fmt.Sprintf("'%04d-%02d-%02d'", year, month, day)
}

func generateTimestamp(r *rand.Rand) string {
	now := time.Now().UTC()
	randTime := now.Add(time.Duration(r.Intn(1000000)) * time.Hour)
	return fmt.Sprintf("%s %s", generateDate(r), randTime.Format("'15:04:05'"))
}
