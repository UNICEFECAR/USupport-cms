/* eslint-disable */
const CKEConfig = () => ({
  presets: {
    default: {
      field: {
        key: "default",
        value: "default",
        metadatas: {
          intlLabel: {
            id: "ckeditor.preset.default.label",
            defaultMessage: "Default (HTML)",
          },
        },
      },

      editorConfig: {
        placeholder: "Default editor (HTML output)",

        plugins: [
          globalThis.SH_CKE.Essentials,
          globalThis.SH_CKE.Autoformat,
          globalThis.SH_CKE.Paragraph,
          globalThis.SH_CKE.Heading,
          globalThis.SH_CKE.Alignment,

          globalThis.SH_CKE.Bold,
          globalThis.SH_CKE.Italic,
          globalThis.SH_CKE.Strikethrough,
          globalThis.SH_CKE.Link,

          globalThis.SH_CKE.List,
          globalThis.SH_CKE.Indent,
          globalThis.SH_CKE.BlockQuote,
          globalThis.SH_CKE.HorizontalLine,

          globalThis.SH_CKE.Image,
          globalThis.SH_CKE.ImageCaption,
          globalThis.SH_CKE.ImageStyle,
          globalThis.SH_CKE.ImageToolbar,
          globalThis.SH_CKE.ImageUpload,

          globalThis.SH_CKE.MediaEmbed,

          globalThis.SH_CKE.Table,
          globalThis.SH_CKE.TableToolbar,
          globalThis.SH_CKE.TableProperties,
          globalThis.SH_CKE.TableCellProperties,
          globalThis.SH_CKE.TableColumnResize,
          globalThis.SH_CKE.TableCaption,

          globalThis.SH_CKE.FontFamily,
          globalThis.SH_CKE.FontSize,
          globalThis.SH_CKE.FontColor,
          globalThis.SH_CKE.FontBackgroundColor,

          globalThis.SH_CKE.SourceEditing,

          globalThis.SH_CKE.StrapiMediaLib,
          globalThis.SH_CKE.StrapiUploadAdapter,

          // 🔑 REQUIRED FOR HTML OUTPUT
          globalThis.SH_CKE.GeneralHtmlSupport,
        ],

        toolbar: {
          items: [
            "heading",
            "fontFamily",
            "fontSize",
            "fontColor",
            "fontBackgroundColor",
            "|",
            "bold",
            "italic",
            "strikethrough",
            "link",
            "|",
            "alignment",
            "|",
            "bulletedList",
            "numberedList",
            "|",
            "insertTable",
            "|",
            "uploadImage",
            "strapiMediaLib",
            "blockQuote",
            "horizontalLine",
            "-",
            "sourceEditing",
            "|",
            "outdent",
            "indent",
            "|",
            "undo",
            "redo",
          ],
          shouldNotGroupWhenFull: true,
        },

        /**
         * 🔑 HTML OUTPUT CONFIG
         */
        htmlSupport: {
          allow: [
            {
              name: /.*/,
              attributes: true,
              classes: true,
              styles: true,
            },
          ],
        },

        /**
         * Table config
         */
        table: {
          contentToolbar: [
            "tableColumn",
            "tableRow",
            "mergeTableCells",
            "tableProperties",
            "tableCellProperties",
            "toggleTableCaption",
          ],
        },

        /**
         * Image config
         */
        image: {
          toolbar: [
            "imageStyle:inline",
            "imageStyle:block",
            "imageStyle:side",
            "|",
            "toggleImageCaption",
            "imageTextAlternative",
          ],
        },
      },
    },
  },
});
