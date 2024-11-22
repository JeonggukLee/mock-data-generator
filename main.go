package main

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/JeonggukLee/mock-data-generator/ddl"
	"github.com/JeonggukLee/mock-data-generator/file"
	"github.com/JeonggukLee/mock-data-generator/mock"
	"github.com/JeonggukLee/mock-data-generator/sql"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/layout"
	"fyne.io/fyne/v2/storage"
	"fyne.io/fyne/v2/widget"
)

func main() {
	application := app.New()
	window := application.NewWindow("DDL Mock Data Generator")

	ddlPathLabel := widget.NewLabel("DDL")
	ddlPathEntry := widget.NewEntry()
	ddlPathEntry.SetPlaceHolder("Enter DDL file path or select a file")

	outputLabel := widget.NewLabel("Output")
	outputEntry := widget.NewMultiLineEntry()
	outputEntry.SetPlaceHolder("Generated SQL will appear here...")
	outputEntry.Wrapping = fyne.TextWrapWord

	scrollableOutput := container.NewVScroll(outputEntry)
	scrollableOutput.SetMinSize(fyne.NewSize(600, 450))

	fileButton := widget.NewButton("Select File", func() {
		initialDir := filepath.Dir(ddlPathEntry.Text)
		if ddlPathEntry.Text == "" || !isDir(initialDir) {
			initialDir = os.Getenv("HOME") // or any default directory
		}

		openFileDialog := dialog.NewFileOpen(func(uc fyne.URIReadCloser, err error) {
			if uc != nil {
				ddlPathEntry.SetText(uc.URI().Path())
			}
		}, window)

		location, err := storage.ListerForURI(storage.NewFileURI(initialDir))
		if err == nil {
			openFileDialog.SetLocation(location)
		}

		openFileDialog.Show()
	})

	generateButton := widget.NewButton("Generate SQL", func() {
		outputEntry.SetText("") // Clear the output widget on generate button click

		ddlFilePath := ddlPathEntry.Text
		if ddlFilePath == "" {
			outputEntry.SetText("【Error】: Please select a DDL file.")
			return
		}

		ddlContent, err := file.Read(ddlFilePath)
		if err != nil {
			outputEntry.SetText(fmt.Sprintf("【Error】: %s", err.Error()))
			return
		}

		table, err := ddl.Parse(ddlContent)
		if err != nil {
			outputEntry.SetText(fmt.Sprintf("【Error】: %s", err.Error()))
			return
		}

		mockData := mock.Generate(table.Columns)
		insertSQL, updateSQL := sql.Generate(table, mockData)
		outputEntry.SetText(insertSQL + "\n" + updateSQL)
	})

	content := container.NewVBox(
		container.New(
			layout.NewFormLayout(),
			ddlPathLabel,
			ddlPathEntry,
		),
		fileButton,
		outputLabel,
		scrollableOutput,
		generateButton,
	)

	window.SetContent(content)
	window.Resize(fyne.NewSize(600, 600))
	window.ShowAndRun()
}

func isDir(path string) bool {
	info, err := os.Stat(path)
	if os.IsNotExist(err) {
		return false
	}
	return info.IsDir()
}
