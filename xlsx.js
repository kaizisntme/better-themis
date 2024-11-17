const XLSX = require("xlsx");

let data = [
  {
    "User 1": {
      "Prob 1": { point: 1 },
    },
    "User 2": {
      "Prob 1": { point: 1 },
      "Prob 2": { point: 1 },
    },
    kaizisntme: {
      example: { point: 10 },
    },
  },
];

let worksheet = XLSX.utils.json_to_sheet(data);
let workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

XLSX.writeFile(workbook, "Kết quả Better Themis.xlsx");
