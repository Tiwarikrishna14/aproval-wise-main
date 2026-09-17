import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileSpreadsheet,
  ImageIcon,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { DataError, TableLoadingRows, TableMessageRow } from "@/components/data-state";

import { PageHeader } from "@/components/page-parts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  branchesApi,
  branchRecords,
  businessCustomersApi,
  type BranchResponse,
  type BusinessCustomerResponse,
  type PageResponse,
  organizationsApi,
  type ProductForm,
  type ProductResponse,
  productRecords,
  productsApi,
} from "@/services/admin-api.service";
import { getApiAssetUrl } from "@/services/api-client";

import { useAuth } from "@/lib/auth-context";
import {
  hasPermission,
  isBranchScopedUser,
  isCustomerProductOnlyUser,
  isSuperAdmin,
} from "@/lib/permissions";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [{ title: "Products - Akribiz B2B" }],
  }),
  component: ProductsPage,
});

const emptyProductForm: ProductForm = {
  category: "",
  customerSellCode: "",
  navItemCode: "",
  itemDescription: "",
  uom: "",
  unitRate: 0.0,
};

const categories = ["House Keeping", "Pantry", "Staionery"];

const uoms = ["EA", "PCS", "SET", "KG", "MTR", "LTR", "BOX"];
const productStatuses = ["ACTIVE", "INACTIVE"];

const productImageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const bulkProductExtensions = [".csv", ".xls", ".xlsx"];
const productImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const bulkTemplateCsv = [
  "category,navItemCode,itemDescription,uom,unitRate,image",
  "Food,NAV001,Rice Bag,KG,120.00,rice.jpg",
  "Food,NAV002,Wheat Bag,KG,95.00,wheat.png",
  "Food,NAV003,Sugar Bag,KG,82.50,",
].join("\n");

const bulkTemplateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(bulkTemplateCsv)}`;
const productPageSizes = [10, 20, 50, 100];

type FormMessage = {
  tone: "success" | "destructive";
  text: string;
};

type ProductEditorForm = ProductForm & {
  status: string;
};

function hasAllowedExtension(fileName: string, extensions: string[]) {
  const lowerName = fileName.toLowerCase();
  return extensions.some((extension) => lowerName.endsWith(extension));
}

function isAllowedProductImage(file: File) {
  return (
    hasAllowedExtension(file.name, productImageExtensions) &&
    (!file.type || productImageTypes.includes(file.type))
  );
}

function formDataFromProduct(form: ProductForm, image: File) {
  const data = new FormData();

  data.set("category", form.category);
  data.set("customerSellCode", form.customerSellCode);
  data.set("navItemCode", form.navItemCode);
  data.set("itemDescription", form.itemDescription);
  data.set("uom", form.uom);
  data.set("unitRate", String(form.unitRate));
  data.set("image", image);

  return data;
}

function formDataFromProductUpdate(
  form: ProductEditorForm,
  image: File | null,
  removeImage: boolean,
) {
  const data = new FormData();

  data.set("category", form.category);
  data.set("customerSellCode", form.customerSellCode);
  data.set("navItemCode", form.navItemCode);
  data.set("itemDescription", form.itemDescription);
  data.set("uom", form.uom);
  data.set("unitRate", String(form.unitRate));
  data.set("status", form.status);

  if (removeImage) data.set("removeImage", "true");
  if (image) data.set("image", image);

  return data;
}

function validateProductForm(form: ProductForm) {
  if (!form.category.trim()) return "Select a category.";
  if (!form.customerSellCode.trim()) return "Select a Customer Sell Code.";
  if (!form.navItemCode.trim()) return "Enter NAV item code.";
  if (!form.itemDescription.trim()) return "Enter item description.";
  if (!form.uom.trim()) return "Select UOM.";
  if (!Number.isFinite(form.unitRate) || form.unitRate <= 0)
    return "Unit rate must be greater than 0.";

  return "";
}

function productSelectionKey(product: ProductResponse) {
  return String(product.id ?? `${product.customerSellCode}:${product.navItemCode}`);
}

function productPageResponse(value: PageResponse<ProductResponse> | ProductResponse[] | undefined) {
  return Array.isArray(value) ? undefined : value;
}

type ProductExportImage = {
  data: Uint8Array;
  extension: "jpg" | "png";
  contentType: "image/jpeg" | "image/png";
};

type ProductWorkbookRow = {
  product: ProductResponse;
  image: ProductExportImage | null;
};

type DetectedProductImageType = {
  extension: "gif" | "jpg" | "png" | "webp";
  contentType: "image/gif" | "image/jpeg" | "image/png" | "image/webp";
};

type ZipEntry = {
  name: string;
  data: Uint8Array;
};

const xlsxMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const zipTextEncoder = new TextEncoder();

function xmlValue(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function zipText(value: string) {
  return zipTextEncoder.encode(value);
}

function safeExportFileName(value: string) {
  return (value || "selected").replace(/[\\/:*?"<>|]+/g, "-");
}

function detectProductImageType(
  data: Uint8Array,
  contentType: string | null | undefined,
): DetectedProductImageType | null {
  const normalizedType = (contentType ?? "").split(";")[0].trim().toLowerCase();

  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }

  if (
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return { extension: "png", contentType: "image/png" };
  }

  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) {
    return { extension: "gif", contentType: "image/gif" };
  }

  if (
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  ) {
    return { extension: "webp", contentType: "image/webp" };
  }

  if (normalizedType.startsWith("image/")) {
    return null;
  }

  return null;
}

function imageBlobToPngBytes(blob: Blob) {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return Promise.resolve<Uint8Array | null>(null);
  }

  return new Promise<Uint8Array | null>((resolve) => {
    const imageUrl = URL.createObjectURL(blob);
    const image = new Image();

    const cleanup = () => URL.revokeObjectURL(imageUrl);

    image.onload = () => {
      try {
        const width = image.naturalWidth || image.width || 1;
        const height = image.naturalHeight || image.height || 1;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = width;
        canvas.height = height;

        if (!context) {
          cleanup();
          resolve(null);
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob((pngBlob) => {
          cleanup();

          if (!pngBlob) {
            resolve(null);
            return;
          }

          pngBlob
            .arrayBuffer()
            .then((buffer) => resolve(new Uint8Array(buffer)))
            .catch(() => resolve(null));
        }, "image/png");
      } catch {
        cleanup();
        resolve(null);
      }
    };

    image.onerror = () => {
      cleanup();
      resolve(null);
    };

    image.src = imageUrl;
  });
}

async function imagePathToWorkbookImage(imagePath?: string): Promise<ProductExportImage | null> {
  if (!imagePath) return null;

  try {
    const response = await fetch(getApiAssetUrl(imagePath), { credentials: "include" });

    if (!response.ok) return null;

    const blob = await response.blob();
    const data = new Uint8Array(await blob.arrayBuffer());
    const detectedType = detectProductImageType(
      data,
      blob.type || response.headers.get("content-type"),
    );

    if (!detectedType) return null;

    if (detectedType.extension === "png" || detectedType.extension === "jpg") {
      return {
        data,
        extension: detectedType.extension,
        contentType: detectedType.extension === "png" ? "image/png" : "image/jpeg",
      };
    }

    const pngData = await imageBlobToPngBytes(new Blob([data], { type: detectedType.contentType }));

    return pngData
      ? {
          data: pngData,
          extension: "png",
          contentType: "image/png",
        }
      : null;
  } catch {
    return null;
  }
}

function xlsxInlineCell(reference: string, value: unknown) {
  return `<c r="${reference}" t="inlineStr"><is><t>${xmlValue(value)}</t></is></c>`;
}

function xlsxNumberCell(reference: string, value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return xlsxInlineCell(reference, "");
  }

  return `<c r="${reference}"><v>${number}</v></c>`;
}

function productWorksheetXml(rows: ProductWorkbookRow[]) {
  const headers = [
    "Image",
    "Category",
    "Customer Sell Code",
    "NAV Item Code",
    "Item Description",
    "UOM",
    "Unit Rate",
  ];
  const columnWidths = [14, 20, 20, 18, 38, 12, 14];
  const headerCells = headers
    .map((header, index) => xlsxInlineCell(`${String.fromCharCode(65 + index)}1`, header))
    .join("");
  const dataRows = rows
    .map(({ product, image }, index) => {
      const rowNumber = index + 2;
      const rowHeight = image ? 62 : 24;
      const cells = [
        xlsxInlineCell(`B${rowNumber}`, product.category),
        xlsxInlineCell(`C${rowNumber}`, product.customerSellCode),
        xlsxInlineCell(`D${rowNumber}`, product.navItemCode),
        xlsxInlineCell(`E${rowNumber}`, product.itemDescription),
        xlsxInlineCell(`F${rowNumber}`, product.uom),
        xlsxNumberCell(`G${rowNumber}`, product.unitRate),
      ].join("");

      return `<row r="${rowNumber}" ht="${rowHeight}" customHeight="1">${cells}</row>`;
    })
    .join("");
  const columns = columnWidths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
    )
    .join("");
  const finalRow = Math.max(rows.length + 1, 1);
  const hasImages = rows.some((row) => row.image);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:G${finalRow}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${columns}</cols>
  <sheetData>
    <row r="1" ht="22" customHeight="1">${headerCells}</row>
    ${dataRows}
  </sheetData>
  ${hasImages ? '<drawing r:id="rId1"/>' : ""}
</worksheet>`;
}

function productDrawingImages(rows: ProductWorkbookRow[]) {
  const images: Array<ProductExportImage & { imageIndex: number; rowNumber: number }> = [];

  rows.forEach((row, index) => {
    if (!row.image) return;

    images.push({
      ...row.image,
      imageIndex: images.length + 1,
      rowNumber: index + 2,
    });
  });

  return images;
}

function productDrawingXml(images: ReturnType<typeof productDrawingImages>) {
  const imageSize = 609600;
  const anchors = images
    .map((image) => {
      const zeroBasedRow = image.rowNumber - 1;

      return `<xdr:oneCellAnchor>
  <xdr:from>
    <xdr:col>0</xdr:col>
    <xdr:colOff>95250</xdr:colOff>
    <xdr:row>${zeroBasedRow}</xdr:row>
    <xdr:rowOff>95250</xdr:rowOff>
  </xdr:from>
  <xdr:ext cx="${imageSize}" cy="${imageSize}"/>
  <xdr:pic>
    <xdr:nvPicPr>
      <xdr:cNvPr id="${image.imageIndex}" name="Product Image ${image.imageIndex}"/>
      <xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>
    </xdr:nvPicPr>
    <xdr:blipFill>
      <a:blip r:embed="rId${image.imageIndex}"/>
      <a:stretch><a:fillRect/></a:stretch>
    </xdr:blipFill>
    <xdr:spPr>
      <a:xfrm><a:off x="0" y="0"/><a:ext cx="${imageSize}" cy="${imageSize}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    </xdr:spPr>
  </xdr:pic>
  <xdr:clientData/>
</xdr:oneCellAnchor>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  ${anchors}
</xdr:wsDr>`;
}

function productDrawingRelsXml(images: ReturnType<typeof productDrawingImages>) {
  const relationships = images
    .map(
      (image) =>
        `<Relationship Id="rId${image.imageIndex}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${image.imageIndex}.${image.extension}"/>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`;
}

function xlsxContentTypesXml(images: ReturnType<typeof productDrawingImages>) {
  const imageDefaults = Array.from(
    new Map(images.map((image) => [image.extension, image.contentType])).entries(),
  )
    .map(
      ([extension, contentType]) =>
        `<Default Extension="${extension}" ContentType="${contentType}"/>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${imageDefaults}
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  ${images.length ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ""}
</Types>`;
}

function xlsxRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function xlsxWorkbookXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Products" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

function xlsxWorkbookRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function xlsxWorksheetRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;
}

function xlsxStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function xlsxCorePropsXml() {
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Order Approval</dc:creator>
  <cp:lastModifiedBy>Order Approval</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function xlsxAppPropsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Order Approval</Application>
</Properties>`;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i += 1) {
    let value = (crc ^ data[i]) & 0xff;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    crc = (crc >>> 8) ^ value;
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function zipDosTimeDate(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { dosTime, dosDate };
}

function combineBytes(chunks: Uint8Array[]) {
  const output = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;

  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });

  return output;
}

function createZip(entries: ZipEntry[]) {
  const chunks: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  const { dosTime, dosDate } = zipDosTimeDate();
  let offset = 0;

  entries.forEach((entry) => {
    const name = zipText(entry.name);
    const checksum = crc32(entry.data);
    const localHeader = new Uint8Array(30 + name.length);
    const localView = new DataView(localHeader.buffer);
    const localOffset = offset;

    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, entry.data.length, true);
    localView.setUint32(22, entry.data.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(name, 30);
    chunks.push(localHeader, entry.data);
    offset += localHeader.length + entry.data.length;

    const centralHeader = new Uint8Array(46 + name.length);
    const centralView = new DataView(centralHeader.buffer);

    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, entry.data.length, true);
    centralView.setUint32(24, entry.data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, localOffset, true);
    centralHeader.set(name, 46);
    centralDirectory.push(centralHeader);
  });

  const centralOffset = offset;
  const centralBytes = combineBytes(centralDirectory);
  const endHeader = new Uint8Array(22);
  const endView = new DataView(endHeader.buffer);

  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralBytes.length, true);
  endView.setUint32(16, centralOffset, true);
  endView.setUint16(20, 0, true);

  return combineBytes([...chunks, centralBytes, endHeader]);
}

function createProductWorkbookBlob(rows: ProductWorkbookRow[]) {
  const images = productDrawingImages(rows);
  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: zipText(xlsxContentTypesXml(images)) },
    { name: "_rels/.rels", data: zipText(xlsxRootRelsXml()) },
    { name: "docProps/core.xml", data: zipText(xlsxCorePropsXml()) },
    { name: "docProps/app.xml", data: zipText(xlsxAppPropsXml()) },
    { name: "xl/workbook.xml", data: zipText(xlsxWorkbookXml()) },
    { name: "xl/_rels/workbook.xml.rels", data: zipText(xlsxWorkbookRelsXml()) },
    { name: "xl/styles.xml", data: zipText(xlsxStylesXml()) },
    { name: "xl/worksheets/sheet1.xml", data: zipText(productWorksheetXml(rows)) },
  ];

  if (images.length) {
    entries.push(
      { name: "xl/worksheets/_rels/sheet1.xml.rels", data: zipText(xlsxWorksheetRelsXml()) },
      { name: "xl/drawings/drawing1.xml", data: zipText(productDrawingXml(images)) },
      { name: "xl/drawings/_rels/drawing1.xml.rels", data: zipText(productDrawingRelsXml(images)) },
      ...images.map((image) => ({
        name: `xl/media/image${image.imageIndex}.${image.extension}`,
        data: image.data,
      })),
    );
  }

  return new Blob([createZip(entries)], { type: xlsxMimeType });
}

function ProductsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const productOnlyCustomer = isCustomerProductOnlyUser(user);
  const canView = productOnlyCustomer || hasPermission(user, "PRODUCT_VIEW");
  const canCreate = !productOnlyCustomer && hasPermission(user, "PRODUCT_CREATE");
  const isSa = isSuperAdmin(user);
  const branchScopedUser = isBranchScopedUser(user);
  const canChooseBranch = !branchScopedUser && !productOnlyCustomer;
  const canManageProductRows = !productOnlyCustomer;
  const canEditProducts =
    canManageProductRows && (isSa || canCreate || hasPermission(user, "PRODUCT_UPDATE"));
  const canDeleteProducts =
    canManageProductRows && (isSa || canCreate || hasPermission(user, "PRODUCT_DELETE"));
  const assignedBusinessCustomerId = isSa ? undefined : user?.businessCustomerId;

  /*
   * ============================================================
   * ORGANIZATION / BRANCH
   *
   * These are ONLY used to fetch Customer Sell Codes.
   * They are NOT sent to Product API.
   * ============================================================
   */

  const [organizationId, setOrganizationId] = useState(isSa ? "" : (user?.organizationId ?? ""));

  const [branchId, setBranchId] = useState(branchScopedUser ? (user?.branchId ?? "") : "");

  /*
   * Selected Customer Sell Code.
   * This is the ONLY filter sent to Product API.
   */
  const [customerSellCode, setCustomerSellCode] = useState("");

  /*
   * ============================================================
   * PRODUCT FORM
   * ============================================================
   */

  const [productDialogOpen, setProductDialogOpen] = useState(false);

  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreviewUrl, setProductImagePreviewUrl] = useState("");
  const [productImageInputKey, setProductImageInputKey] = useState(0);
  const [productImageError, setProductImageError] = useState("");
  const [productMessage, setProductMessage] = useState<FormMessage | null>(null);
  const [editProductDialogOpen, setEditProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null);
  const [editProductForm, setEditProductForm] = useState<ProductEditorForm>({
    ...emptyProductForm,
    status: "ACTIVE",
  });
  const [editProductImageFile, setEditProductImageFile] = useState<File | null>(null);
  const [editProductImagePreviewUrl, setEditProductImagePreviewUrl] = useState("");
  const [editProductImageInputKey, setEditProductImageInputKey] = useState(0);
  const [editProductImageError, setEditProductImageError] = useState("");
  const [editRemoveImage, setEditRemoveImage] = useState(false);
  const [editProductMessage, setEditProductMessage] = useState<FormMessage | null>(null);
  const [bulkCustomerSellCode, setBulkCustomerSellCode] = useState("");
  const [bulkProductFile, setBulkProductFile] = useState<File | null>(null);
  const [bulkImageFiles, setBulkImageFiles] = useState<File[]>([]);
  const [bulkProductFileInputKey, setBulkProductFileInputKey] = useState(0);
  const [bulkImageInputKey, setBulkImageInputKey] = useState(0);
  const [bulkError, setBulkError] = useState("");
  const [bulkMessage, setBulkMessage] = useState<FormMessage | null>(null);
  const [productPage, setProductPage] = useState(0);
  const [productPageSize, setProductPageSize] = useState(10);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, ProductResponse>>({});
  const [isExportingProducts, setIsExportingProducts] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<FormMessage | null>(null);

  /*
   * ============================================================
   * ORGANIZATIONS
   *
   * Only Super Admin needs this dropdown.
   * ============================================================
   */

  const organizationsQuery = useQuery({
    queryKey: ["admin", "branches", "organizations"],

    queryFn: async () =>
      (await organizationsApi.list({ size: 100 })).data.content.filter(
        (item) => item.organizationType === "PARENT",
      ),

    enabled: isSa,

    retry: false,

    staleTime: 60 * 1000,
  });

  /*
   * ============================================================
   * BRANCHES
   *
   * Organization + Branch are used only to fetch customers
   * and therefore Customer Sell Codes.
   * ============================================================
   */

  const branchesQuery = useQuery({
    queryKey: ["admin", "customers", "branches", organizationId],

    queryFn: async () =>
      branchRecords(
        (
          await branchesApi.list({
            size: 100,
            organizationId,
          })
        ).data,
      ),

    enabled: canChooseBranch && Boolean(organizationId),

    retry: false,

    staleTime: 60 * 1000,
  });

  const branches = branchRecords(branchesQuery.data);

  /*
   * ============================================================
   * BUSINESS CUSTOMERS
   *
   * Super Admin gets Organization + Branch.
   * Customer users get their assigned Business Customer.
   * Organization/branch admins get customers from their assigned scope.
   *
   * From this response we get Customer Sell Codes.
   * ============================================================
   */

  const customersQuery = useQuery({
    queryKey: ["admin", "business-customers", organizationId, branchId, assignedBusinessCustomerId],

    queryFn: async () => {
      if (!isSa) {
        if (assignedBusinessCustomerId) {
          return [(await businessCustomersApi.get(assignedBusinessCustomerId)).data];
        }

        return (
          await businessCustomersApi.list({
            organizationId: organizationId || undefined,
            branchId: branchId || undefined,
          })
        ).data;
      }

      return (
        await businessCustomersApi.list({
          organizationId: organizationId || undefined,
          branchId: branchId || undefined,
        })
      ).data;
    },

    enabled:
      (canView || canCreate) &&
      (canChooseBranch
        ? Boolean(organizationId) && Boolean(branchId)
        : Boolean(assignedBusinessCustomerId || organizationId || branchId)),

    retry: false,

    staleTime: 60 * 1000,
  });

  const customers: BusinessCustomerResponse[] = Array.isArray(customersQuery.data)
    ? customersQuery.data
    : (customersQuery.data?.content ?? []);

  /*
   * ============================================================
   * CUSTOMER SELL CODE LIST
   *
   * Change customerSellCode below if your backend uses
   * a different property name.
   * ============================================================
   */

  const sellCodes = customers
    .map((customer) => ({
      id: customer.id,

      code: customer.customerCode ?? "",

      name: customer.name ?? "",
    }))
    .filter((item) => item.code)
    .filter((item, index, array) => array.findIndex((x) => x.code === item.code) === index);

  const assignedCustomerSellCode = !isSa && sellCodes.length === 1 ? sellCodes[0].code : "";
  const canChooseScopedCustomerSellCode = !isSa && sellCodes.length > 1;

  const productFetchQuery = useQuery({
    queryKey: ["admin", "product-list", customerSellCode, productPage, productPageSize],
    queryFn: async () =>
      (
        await productsApi.list({
          page: productPage,
          size: productPageSize,
          customerSellCode,
        })
      ).data,
    enabled: Boolean(customerSellCode) && (canView || canCreate),
    retry: false,
    staleTime: 60 * 1000,
  });
  const products = productRecords(productFetchQuery.data).filter(
    (product) => isSa || product.customerSellCode === customerSellCode,
  );
  const pageResponse = productPageResponse(productFetchQuery.data);
  const totalElements = pageResponse?.totalElements ?? products.length;
  const totalPages = pageResponse?.totalPages ?? (products.length ? 1 : 0);
  const selectedProductList = Object.values(selectedProducts);
  const selectedProductIds = selectedProductList
    .map((product) => product.id)
    .filter((id): id is number => typeof id === "number");
  const currentPageProductKeys = products.map(productSelectionKey);
  const selectedCurrentPageCount = currentPageProductKeys.filter(
    (key) => selectedProducts[key],
  ).length;
  const allCurrentPageSelected =
    products.length > 0 && selectedCurrentPageCount === products.length;
  const currentPageSelectionState = allCurrentPageSelected
    ? true
    : selectedCurrentPageCount > 0
      ? "indeterminate"
      : false;
  const pageStart = totalElements === 0 ? 0 : productPage * productPageSize + 1;
  const pageEnd =
    totalElements === 0
      ? 0
      : Math.min(productPage * productPageSize + products.length, totalElements);
  const productTableColumnCount = canManageProductRows ? 10 : 8;

  useEffect(() => {
    if (!productImageFile) {
      setProductImagePreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(productImageFile);
    setProductImagePreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [productImageFile]);

  useEffect(() => {
    if (!editProductImageFile) {
      setEditProductImagePreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(editProductImageFile);
    setEditProductImagePreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [editProductImageFile]);

  useEffect(() => {
    setProductPage(0);
    setSelectedProducts({});
  }, [customerSellCode]);

  useEffect(() => {
    if (totalPages > 0 && productPage > totalPages - 1) {
      setProductPage(totalPages - 1);
    }
  }, [productPage, totalPages]);

  /*
   * ============================================================
   * CREATE PRODUCT
   * ============================================================
   */

  const createProduct = useMutation({
    mutationFn: ({ form, image }: { form: ProductForm; image?: File | null }) =>
      image
        ? productsApi.createWithImage(formDataFromProduct(form, image))
        : productsApi.create(form),

    onSuccess: async () => {
      setProductDialogOpen(false);
      setProductMessage({
        tone: "success",
        text: "Product created successfully.",
      });

      resetProductCreateForm();

      await queryClient.invalidateQueries({
        queryKey: ["admin", "product-list"],
      });
    },

    onError: (error) => {
      setProductMessage({
        tone: "destructive",
        text: error instanceof Error ? error.message : "Failed to create product.",
      });
    },
  });

  const bulkUpload = useMutation({
    mutationFn: ({
      customerSellCode,
      file,
      images,
    }: {
      customerSellCode: string;
      file: File;
      images: File[];
    }) => {
      const data = new FormData();
      data.set("file", file);
      images.forEach((image) => data.append("images", image));

      return productsApi.bulkUpload(customerSellCode, data);
    },

    onSuccess: async () => {
      setBulkMessage({
        tone: "success",
        text: "Bulk product upload completed successfully.",
      });
      resetBulkUploadForm();

      await queryClient.invalidateQueries({
        queryKey: ["admin", "product-list"],
      });
    },

    onError: (error) => {
      setBulkMessage({
        tone: "destructive",
        text: error instanceof Error ? error.message : "Bulk upload failed.",
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({
      id,
      form,
      image,
      removeImage,
    }: {
      id: number;
      form: ProductEditorForm;
      image?: File | null;
      removeImage: boolean;
    }) =>
      image || removeImage
        ? productsApi.updateWithImage(
            id,
            formDataFromProductUpdate(form, image ?? null, removeImage),
          )
        : productsApi.update(id, {
            ...form,
            removeImage: false,
          }),

    onSuccess: async () => {
      setProductMessage({
        tone: "success",
        text: "Product updated successfully.",
      });
      closeEditProductDialog();
      setSelectedProducts({});

      await queryClient.invalidateQueries({
        queryKey: ["admin", "product-list"],
      });
    },

    onError: (error) => {
      setEditProductMessage({
        tone: "destructive",
        text: error instanceof Error ? error.message : "Failed to update product.",
      });
    },
  });

  const bulkDeleteProducts = useMutation({
    mutationFn: (ids: number[]) => productsApi.bulkDelete(ids),

    onSuccess: async () => {
      const deletedCount = selectedProductIds.length;

      setDeleteConfirmOpen(false);
      setDeleteMessage(null);
      setSelectedProducts({});
      setProductMessage({
        tone: "success",
        text: `${deletedCount} product${deletedCount === 1 ? "" : "s"} deleted successfully.`,
      });

      await queryClient.invalidateQueries({
        queryKey: ["admin", "product-list"],
      });
    },

    onError: (error) => {
      setDeleteMessage({
        tone: "destructive",
        text: error instanceof Error ? error.message : "Failed to delete selected products.",
      });
    },
  });

  function resetProductCreateForm() {
    setProductForm({
      ...emptyProductForm,
      customerSellCode: isSa ? "" : customerSellCode,
    });
    setProductImageFile(null);
    setProductImageError("");
    setProductImageInputKey((key) => key + 1);
  }

  function resetEditProductForm() {
    setEditingProduct(null);
    setEditProductForm({
      ...emptyProductForm,
      status: "ACTIVE",
    });
    setEditProductImageFile(null);
    setEditProductImageError("");
    setEditRemoveImage(false);
    setEditProductMessage(null);
    setEditProductImageInputKey((key) => key + 1);
  }

  function resetBulkUploadForm() {
    setBulkProductFile(null);
    setBulkImageFiles([]);
    setBulkError("");
    setBulkProductFileInputKey((key) => key + 1);
    setBulkImageInputKey((key) => key + 1);
    if (!isSa) setBulkCustomerSellCode(customerSellCode);
  }

  function handleProductImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setProductImageError("");

    if (!file) {
      setProductImageFile(null);
      return;
    }

    if (!isAllowedProductImage(file)) {
      setProductImageFile(null);
      setProductImageInputKey((key) => key + 1);
      setProductImageError("Use a JPG, JPEG, PNG, WEBP, or GIF image.");
      return;
    }

    setProductImageFile(file);
  }

  function removeProductImage() {
    setProductImageFile(null);
    setProductImageError("");
    setProductImageInputKey((key) => key + 1);
  }

  function handleEditProductImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setEditProductImageError("");

    if (!file) {
      setEditProductImageFile(null);
      return;
    }

    if (!isAllowedProductImage(file)) {
      setEditProductImageFile(null);
      setEditProductImageInputKey((key) => key + 1);
      setEditProductImageError("Use a JPG, JPEG, PNG, WEBP, or GIF image.");
      return;
    }

    setEditRemoveImage(false);
    setEditProductImageFile(file);
  }

  function removeEditProductImageSelection() {
    setEditProductImageFile(null);
    setEditProductImageError("");
    setEditProductImageInputKey((key) => key + 1);
  }

  function markEditProductImageForRemoval() {
    setEditRemoveImage(true);
    removeEditProductImageSelection();
  }

  function handleBulkProductFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setBulkError("");

    if (!file) {
      setBulkProductFile(null);
      return;
    }

    if (!hasAllowedExtension(file.name, bulkProductExtensions)) {
      setBulkProductFile(null);
      setBulkProductFileInputKey((key) => key + 1);
      setBulkError("Upload a CSV, XLS, or XLSX product file.");
      return;
    }

    setBulkProductFile(file);
  }

  function handleBulkImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setBulkError("");

    if (!files.length) {
      setBulkImageFiles([]);
      return;
    }

    const invalidFile = files.find((file) => !isAllowedProductImage(file));
    if (invalidFile) {
      setBulkImageFiles([]);
      setBulkImageInputKey((key) => key + 1);
      setBulkError(`${invalidFile.name} is not a supported product image.`);
      return;
    }

    const duplicateFileName = files.find(
      (file, index) => files.findIndex((item) => item.name === file.name) !== index,
    );
    if (duplicateFileName) {
      setBulkImageFiles([]);
      setBulkImageInputKey((key) => key + 1);
      setBulkError(`Duplicate image filename: ${duplicateFileName.name}.`);
      return;
    }

    setBulkImageFiles(files);
  }

  function removeBulkProductFile() {
    setBulkProductFile(null);
    setBulkProductFileInputKey((key) => key + 1);
  }

  function removeBulkImage(name: string) {
    setBulkImageFiles((files) => files.filter((file) => file.name !== name));
    setBulkImageInputKey((key) => key + 1);
  }

  function updateSelectedProduct(product: ProductResponse, selected: boolean) {
    const key = productSelectionKey(product);

    setSelectedProducts((current) => {
      const next = { ...current };

      if (selected) {
        next[key] = product;
      } else {
        delete next[key];
      }

      return next;
    });
  }

  function updateCurrentPageSelection(selected: boolean) {
    setSelectedProducts((current) => {
      const next = { ...current };

      products.forEach((product) => {
        const key = productSelectionKey(product);

        if (selected) {
          next[key] = product;
        } else {
          delete next[key];
        }
      });

      return next;
    });
  }

  function handleProductPageSizeChange(value: string) {
    setProductPageSize(Number(value));
    setProductPage(0);
  }

  function openEditProductDialog(product: ProductResponse) {
    setEditingProduct(product);
    setEditProductForm({
      category: product.category ?? "",
      customerSellCode: product.customerSellCode ?? "",
      navItemCode: product.navItemCode ?? "",
      itemDescription: product.itemDescription ?? "",
      uom: product.uom ?? "",
      unitRate: product.unitRate ?? 0,
      status: product.status || "ACTIVE",
    });
    setEditProductImageFile(null);
    setEditProductImageError("");
    setEditRemoveImage(false);
    setEditProductMessage(null);
    setEditProductImageInputKey((key) => key + 1);
    setEditProductDialogOpen(true);
  }

  function closeEditProductDialog() {
    setEditProductDialogOpen(false);
    resetEditProductForm();
  }

  async function exportSelectedProducts() {
    if (!selectedProductList.length || typeof document === "undefined") return;

    setIsExportingProducts(true);

    try {
      const rows: ProductWorkbookRow[] = await Promise.all(
        selectedProductList.map(async (product) => ({
          product,
          image: await imagePathToWorkbookImage(product.imagePath ?? undefined),
        })),
      );
      const blob = createProductWorkbookBlob(rows);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `products-${safeExportFileName(customerSellCode)}-${date}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingProducts(false);
    }
  }

  function handleConfirmBulkDelete() {
    setDeleteMessage(null);

    if (!selectedProductIds.length) {
      setDeleteMessage({
        tone: "destructive",
        text: "Select at least one product with a valid ID.",
      });
      return;
    }

    bulkDeleteProducts.mutate(selectedProductIds);
  }

  /*
   * ============================================================
   * ORGANIZATION CHANGE
   * ============================================================
   */

  function handleOrganizationChange(value: string) {
    setOrganizationId(value);

    // Reset branch
    setBranchId("");

    // Reset sell code
    setCustomerSellCode("");
    setBulkCustomerSellCode("");
  }

  /*
   * ============================================================
   * BRANCH CHANGE
   * ============================================================
   */

  function handleBranchChange(value: string) {
    setBranchId(value);

    // Reset sell code
    setCustomerSellCode("");
    setBulkCustomerSellCode("");
  }

  /*
   * ============================================================
   * NORMAL USER
   *
   * Organization + Branch automatically come from user.
   * ============================================================
   */

  useEffect(() => {
    if (!isSa) {
      setOrganizationId(user?.organizationId ?? "");

      setBranchId(branchScopedUser ? (user?.branchId ?? "") : "");

      setCustomerSellCode("");
      setProductForm((current) => ({
        ...current,
        customerSellCode: "",
      }));
    }
  }, [branchScopedUser, isSa, user?.businessCustomerId, user?.organizationId, user?.branchId]);

  useEffect(() => {
    if (!assignedCustomerSellCode) return;

    setCustomerSellCode(assignedCustomerSellCode);
    setBulkCustomerSellCode(assignedCustomerSellCode);
    setProductForm((current) =>
      current.customerSellCode === assignedCustomerSellCode
        ? current
        : {
            ...current,
            customerSellCode: assignedCustomerSellCode,
          },
    );
  }, [assignedCustomerSellCode]);

  /*
   * ============================================================
   * CREATE PRODUCT SUBMIT
   * ============================================================
   */

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProductMessage(null);

    const submittedCustomerSellCode = isSa ? productForm.customerSellCode : customerSellCode;
    const form = {
      category: productForm.category,
      customerSellCode: submittedCustomerSellCode,
      navItemCode: productForm.navItemCode,
      itemDescription: productForm.itemDescription,
      uom: productForm.uom,
      unitRate: productForm.unitRate,
    };
    const validationError = validateProductForm(form);

    if (validationError) {
      setProductMessage({
        tone: "destructive",
        text: validationError,
      });
      return;
    }

    createProduct.mutate({
      form,
      image: productImageFile,
    });
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditProductMessage(null);

    if (!editingProduct) return;

    const validationError = validateProductForm(editProductForm);

    if (validationError) {
      setEditProductMessage({
        tone: "destructive",
        text: validationError,
      });
      return;
    }

    if (!editProductForm.status.trim()) {
      setEditProductMessage({
        tone: "destructive",
        text: "Select product status.",
      });
      return;
    }

    updateProduct.mutate({
      id: editingProduct.id,
      form: editProductForm,
      image: editProductImageFile,
      removeImage: editRemoveImage,
    });
  }

  function handleBulkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBulkError("");
    setBulkMessage(null);

    const submittedCustomerSellCode = isSa ? bulkCustomerSellCode : customerSellCode;

    if (!submittedCustomerSellCode) {
      setBulkError("Select a Customer Sell Code before uploading products.");
      return;
    }

    if (!bulkProductFile) {
      setBulkError("Select a CSV, XLS, or XLSX product file.");
      return;
    }

    const duplicateFileName = bulkImageFiles.find(
      (file, index) => bulkImageFiles.findIndex((item) => item.name === file.name) !== index,
    );

    if (duplicateFileName) {
      setBulkError(`Duplicate image filename: ${duplicateFileName.name}.`);
      return;
    }

    bulkUpload.mutate({
      customerSellCode: submittedCustomerSellCode,
      file: bulkProductFile,
      images: bulkImageFiles,
    });
  }

  /*
   * ============================================================
   * CLOSE DIALOG
   * ============================================================
   */

  function handleClose() {
    setProductDialogOpen(false);

    resetProductCreateForm();
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  if (!canView && !canCreate) {
    return (
      <div className="mx-auto max-w-[1400px] rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
        Product access requires PRODUCT_VIEW or PRODUCT_CREATE.
      </div>
    );
  }

  const editProductImageSrc =
    editProductImagePreviewUrl ||
    (!editRemoveImage && editingProduct?.imagePath ? getApiAssetUrl(editingProduct.imagePath) : "");

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* ======================================================
          PAGE HEADER
          ====================================================== */}

      <PageHeader
        title="Products"
        description="Catalog of products, pricing, and assignments."
        actions={
          canCreate ? (
            <Button
              onClick={() => {
                if (!isSa && customerSellCode) {
                  setProductForm((current) => ({
                    ...current,
                    customerSellCode,
                  }));
                }

                setProductDialogOpen(true);
              }}
              disabled={!isSa && !customerSellCode}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Product
            </Button>
          ) : null
        }
      />

      {productMessage?.tone === "success" ? <FormMessageBanner message={productMessage} /> : null}

      {/* ======================================================
          FILTER SECTION
          ====================================================== */}

      {!productOnlyCustomer ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* ==================================================
              ORGANIZATION
              Super Admin ONLY
              ================================================== */}

            {isSa && (
              <div className="space-y-2">
                <Label htmlFor="customer-organization">Parent Organization</Label>

                <select
                  id="customer-organization"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={organizationId}
                  onChange={(event) => handleOrganizationChange(event.target.value)}
                >
                  <option value="">Select organization</option>

                  {(organizationsQuery.data ?? []).map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name} ({organization.organizationCode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ==================================================
              BRANCH
              Super Admin ONLY
              ================================================== */}

            {canChooseBranch && (
              <div className="space-y-2">
                <Label htmlFor="customer-branch">Branch</Label>

                <select
                  id="customer-branch"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={branchId}
                  onChange={(event) => handleBranchChange(event.target.value)}
                  disabled={!organizationId}
                >
                  <option value="">Select branch</option>

                  {branches.map((branch: BranchResponse) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.branchCode ? ` (${branch.branchCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ==================================================
              CUSTOMER SELL CODE
              ================================================== */}

            <div className="space-y-2">
              <Label htmlFor="customer-sell-code-filter">Customer Sell Code</Label>

              {isSa || canChooseScopedCustomerSellCode ? (
                <select
                  id="customer-sell-code-filter"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={customerSellCode}
                  onChange={(event) => setCustomerSellCode(event.target.value)}
                  disabled={
                    customersQuery.isLoading ||
                    (canChooseBranch ? !organizationId || !branchId : sellCodes.length === 0)
                  }
                >
                  <option value="">Select customer sell code</option>

                  {sellCodes.map((item) => (
                    <option key={item.id ?? item.code} value={item.code}>
                      {item.code}
                      {item.name ? ` - ${item.name}` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="customer-sell-code-filter"
                  value={customerSellCode}
                  placeholder={
                    customersQuery.isLoading ? "Loading customer code..." : "Assigned customer code"
                  }
                  readOnly
                />
              )}

              {customersQuery.isLoading && (
                <p className="text-xs text-muted-foreground">Loading customer sell codes...</p>
              )}

              {!customersQuery.isLoading &&
                isSa &&
                organizationId &&
                branchId &&
                sellCodes.length === 0 && (
                  <p className="text-xs text-muted-foreground">No customer sell codes found.</p>
                )}

              {!customersQuery.isLoading && !isSa && sellCodes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No customer sell codes found for your assigned organization or branch.
                </p>
              )}
            </div>
          </div>

          {/* ====================================================
            NORMAL USER MESSAGE
            ==================================================== */}

          {branchScopedUser && (
            <div className="mt-3 text-xs text-muted-foreground">
              Organization and Branch are locked to your account. Customer Sell Code is limited to
              your assigned scope.
            </div>
          )}
        </div>
      ) : null}

      {canCreate ? (
        <section className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Bulk Product Upload</h2>
              <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
                The image column in the CSV or Excel file must exactly match uploaded image
                filenames. Leave the image column blank when a product has no image.
              </p>
            </div>

            <Button asChild variant="outline" size="sm">
              <a href={bulkTemplateHref} download="product-upload-template.csv">
                <Download className="mr-1.5 h-4 w-4" />
                Template
              </a>
            </Button>
          </div>

          <form className="space-y-4" onSubmit={handleBulkSubmit}>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bulk-customer-sell-code">Customer Sell Code</Label>
                {isSa || canChooseScopedCustomerSellCode ? (
                  <select
                    id="bulk-customer-sell-code"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={bulkCustomerSellCode}
                    onChange={(event) => setBulkCustomerSellCode(event.target.value)}
                    disabled={
                      customersQuery.isLoading ||
                      (canChooseBranch ? !organizationId || !branchId : sellCodes.length === 0)
                    }
                    required
                  >
                    <option value="">Select customer sell code</option>
                    {sellCodes.map((item) => (
                      <option key={item.id ?? item.code} value={item.code}>
                        {item.code}
                        {item.name ? ` - ${item.name}` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="bulk-customer-sell-code"
                    value={bulkCustomerSellCode || customerSellCode}
                    readOnly
                    required
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-product-file">Product File</Label>
                <Input
                  key={bulkProductFileInputKey}
                  id="bulk-product-file"
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleBulkProductFileChange}
                  required={!bulkProductFile}
                />
                {bulkProductFile ? (
                  <SelectedFileRow
                    icon={<FileSpreadsheet className="h-4 w-4" />}
                    label={bulkProductFile.name}
                    onRemove={removeBulkProductFile}
                  />
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulk-image-files">Images</Label>
                <Input
                  key={bulkImageInputKey}
                  id="bulk-image-files"
                  type="file"
                  accept={productImageExtensions.join(",")}
                  multiple
                  onChange={handleBulkImagesChange}
                />
                {bulkImageFiles.length ? (
                  <div className="max-h-28 space-y-1 overflow-auto rounded-md border border-border p-2">
                    {bulkImageFiles.map((file) => (
                      <SelectedFileRow
                        key={file.name}
                        icon={<ImageIcon className="h-4 w-4" />}
                        label={file.name}
                        onRemove={() => removeBulkImage(file.name)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {bulkError ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {bulkError}
              </div>
            ) : null}

            {bulkMessage ? <FormMessageBanner message={bulkMessage} /> : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={bulkUpload.isPending || (!isSa && !customerSellCode)}>
                <Upload className="mr-1.5 h-4 w-4" />
                {bulkUpload.isPending ? "Uploading..." : "Upload Products"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {/* ======================================================
          PRODUCT TABLE
          ====================================================== */}

      {productFetchQuery.isError ? (
        <DataError
          message={`Failed to load products: ${
            productFetchQuery.error instanceof Error
              ? productFetchQuery.error.message
              : "Unknown error"
          }`}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            {canManageProductRows ? (
              <>
                <div className="text-sm text-muted-foreground">
                  {selectedProductList.length
                    ? `${selectedProductList.length} selected`
                    : "Select products to export or delete"}
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedProductList.length ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProducts({})}
                    >
                      Clear
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedProductList.length || isExportingProducts}
                    onClick={exportSelectedProducts}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    {isExportingProducts ? "Exporting..." : "Export Excel"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={
                      !canDeleteProducts ||
                      !selectedProductIds.length ||
                      bulkDeleteProducts.isPending ||
                      isExportingProducts
                    }
                    onClick={() => {
                      setDeleteMessage(null);
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete Selected
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Viewing products assigned to your customer code.
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {canManageProductRows ? (
                    <th className="w-12 px-4 py-3 text-left font-medium">
                      <Checkbox
                        aria-label="Select all products on this page"
                        checked={currentPageSelectionState}
                        disabled={!products.length || productFetchQuery.isLoading}
                        onCheckedChange={(checked) => updateCurrentPageSelection(checked === true)}
                      />
                    </th>
                  ) : null}
                  {[
                    "Image",
                    "Product",
                    "NAV Item Code",
                    "Category",
                    "UOM",
                    "Unit Rate",
                    "Customer Sell Code",
                    "Status",
                    ...(canManageProductRows ? [""] : []),
                  ].map((header) => (
                    <th key={header} className="px-4 py-3 text-left font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {productFetchQuery.isLoading ? (
                  <TableLoadingRows columns={productTableColumnCount} />
                ) : !customerSellCode ? (
                  <TableMessageRow
                    columns={productTableColumnCount}
                    message={
                      productOnlyCustomer
                        ? customersQuery.isLoading
                          ? "Loading assigned products..."
                          : "No assigned customer code found for your account."
                        : "Please select a Customer Sell Code."
                    }
                  />
                ) : products.length === 0 ? (
                  <TableMessageRow
                    columns={productTableColumnCount}
                    message={
                      productOnlyCustomer
                        ? "No products found for your account."
                        : "No products found for the selected Customer Sell Code."
                    }
                  />
                ) : (
                  products.map((product: ProductResponse) => {
                    const selectionKey = productSelectionKey(product);

                    return (
                      <tr key={selectionKey} className="border-t border-border hover:bg-surface/50">
                        {canManageProductRows ? (
                          <td className="px-4 py-3">
                            <Checkbox
                              aria-label={`Select ${product.itemDescription || product.navItemCode}`}
                              checked={Boolean(selectedProducts[selectionKey])}
                              onCheckedChange={(checked) =>
                                updateSelectedProduct(product, checked === true)
                              }
                            />
                          </td>
                        ) : null}

                        <td className="px-4 py-3">
                          <ProductImageThumbnail product={product} />
                        </td>

                        <td className="px-4 py-3 font-medium">{product.itemDescription}</td>

                        <td className="px-4 py-3 text-muted-foreground">{product.navItemCode}</td>

                        <td className="px-4 py-3">{product.category ?? "-"}</td>

                        <td className="px-4 py-3">{product.uom ?? "-"}</td>

                        <td className="px-4 py-3 tabular-nums">{formatMoney(product.unitRate)}</td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {product.customerSellCode ?? "-"}
                        </td>

                        <td className="px-4 py-3">
                          {product.status ? <StatusBadge status={product.status} /> : "-"}
                        </td>

                        {canManageProductRows ? (
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={!canEditProducts}
                              onClick={() => openEditProductDialog(product)}
                            >
                              <Pencil className="mr-1.5 h-4 w-4" />
                              Edit
                            </Button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              {totalElements
                ? `Showing ${pageStart}-${pageEnd} of ${totalElements}`
                : "No products to show"}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="products-page-size" className="text-xs">
                Rows
              </Label>
              <select
                id="products-page-size"
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={productPageSize}
                onChange={(event) => handleProductPageSizeChange(event.target.value)}
              >
                {productPageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>

              <div className="mx-2 text-xs">
                Page {totalPages ? productPage + 1 : 0} of {totalPages || 0}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={productPage === 0 || productFetchQuery.isLoading}
                onClick={() => setProductPage((page) => Math.max(0, page - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  productFetchQuery.isLoading || totalPages === 0 || productPage >= totalPages - 1
                }
                onClick={() => setProductPage((page) => page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (bulkDeleteProducts.isPending) return;
          setDeleteConfirmOpen(open);
          if (!open) setDeleteMessage(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected products?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {selectedProductIds.length} selected product
              {selectedProductIds.length === 1 ? "" : "s"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteMessage ? <FormMessageBanner message={deleteMessage} /> : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteProducts.isPending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={bulkDeleteProducts.isPending || !selectedProductIds.length}
              onClick={handleConfirmBulkDelete}
            >
              {bulkDeleteProducts.isPending ? "Deleting..." : "Delete Products"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={editProductDialogOpen}
        onOpenChange={(open) => {
          if (updateProduct.isPending) return;
          if (!open) {
            closeEditProductDialog();
          } else {
            setEditProductDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product details, status, and image.</DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleEditSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-product-category">Category</Label>
                <select
                  id="edit-product-category"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editProductForm.category}
                  onChange={(event) =>
                    setEditProductForm({
                      ...editProductForm,
                      category: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-product-customer-sell-code">Customer Sell Code</Label>
                {isSa || canChooseScopedCustomerSellCode ? (
                  <select
                    id="edit-product-customer-sell-code"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={editProductForm.customerSellCode}
                    onChange={(event) =>
                      setEditProductForm({
                        ...editProductForm,
                        customerSellCode: event.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select customer sell code</option>
                    {sellCodes.map((item) => (
                      <option key={item.id ?? item.code} value={item.code}>
                        {item.code}
                        {item.name ? ` - ${item.name}` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="edit-product-customer-sell-code"
                    value={editProductForm.customerSellCode}
                    readOnly
                    required
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nav-item-code">Nav Item Code</Label>
                <Input
                  id="edit-nav-item-code"
                  value={editProductForm.navItemCode}
                  onChange={(event) =>
                    setEditProductForm({
                      ...editProductForm,
                      navItemCode: event.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-item-description">Item Description</Label>
                <Input
                  id="edit-item-description"
                  value={editProductForm.itemDescription}
                  onChange={(event) =>
                    setEditProductForm({
                      ...editProductForm,
                      itemDescription: event.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-product-uom">UOM</Label>
                <select
                  id="edit-product-uom"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editProductForm.uom}
                  onChange={(event) =>
                    setEditProductForm({
                      ...editProductForm,
                      uom: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select UOM</option>
                  {uoms.map((uom) => (
                    <option key={uom} value={uom}>
                      {uom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-unit-rate">Unit Rate</Label>
                <Input
                  id="edit-unit-rate"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editProductForm.unitRate}
                  onChange={(event) =>
                    setEditProductForm({
                      ...editProductForm,
                      unitRate: Number(event.target.value),
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-product-status">Status</Label>
                <select
                  id="edit-product-status"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editProductForm.status}
                  onChange={(event) =>
                    setEditProductForm({
                      ...editProductForm,
                      status: event.target.value,
                    })
                  }
                  required
                >
                  {productStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 sm:col-span-2">
                <Label htmlFor="edit-product-image">Product Image</Label>

                <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
                    {editProductImageSrc ? (
                      <img
                        src={editProductImageSrc}
                        alt="Product preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="space-y-3">
                    <Input
                      key={editProductImageInputKey}
                      id="edit-product-image"
                      type="file"
                      accept={productImageExtensions.join(",")}
                      onChange={handleEditProductImageChange}
                    />

                    <p className="text-xs text-muted-foreground">
                      Optional JPG, JPEG, PNG, WEBP, or GIF image.
                    </p>

                    {editProductImageFile ? (
                      <SelectedFileRow
                        icon={<ImageIcon className="h-4 w-4" />}
                        label={editProductImageFile.name}
                        onRemove={removeEditProductImageSelection}
                      />
                    ) : null}

                    {editingProduct?.imagePath && !editProductImageFile && !editRemoveImage ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={markEditProductImageForRemoval}
                      >
                        <X className="mr-1.5 h-4 w-4" />
                        Remove current image
                      </Button>
                    ) : null}

                    {editRemoveImage ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                        Current image will be removed.
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditRemoveImage(false)}
                        >
                          Undo
                        </Button>
                      </div>
                    ) : null}

                    {editProductImageError ? (
                      <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {editProductImageError}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {editProductMessage ? <FormMessageBanner message={editProductMessage} /> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={updateProduct.isPending}
                onClick={closeEditProductDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProduct.isPending || Boolean(editProductImageError)}
              >
                {updateProduct.isPending ? "Updating..." : "Update Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================
          CREATE PRODUCT DIALOG
          ====================================================== */}

      <Dialog
        open={productDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          } else {
            setProductDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Create Product</DialogTitle>

            <DialogDescription>Add a new product to the product catalog.</DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* CATEGORY */}

              <div className="space-y-2">
                <Label htmlFor="product-category">Category</Label>

                <select
                  id="product-category"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      category: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select category</option>

                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* CUSTOMER SELL CODE */}

              <div className="space-y-2">
                <Label htmlFor="product-customer-sell-code">Customer Sell Code</Label>

                {isSa || canChooseScopedCustomerSellCode ? (
                  <select
                    id="product-customer-sell-code"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={productForm.customerSellCode}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        customerSellCode: event.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select customer sell code</option>

                    {sellCodes.map((item) => (
                      <option key={item.id ?? item.code} value={item.code}>
                        {item.code}
                        {item.name ? ` - ${item.name}` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="product-customer-sell-code"
                    value={productForm.customerSellCode || customerSellCode}
                    readOnly
                    required
                  />
                )}
              </div>

              {/* NAV ITEM CODE */}

              <div className="space-y-2">
                <Label htmlFor="nav-item-code">Nav Item Code</Label>

                <Input
                  id="nav-item-code"
                  value={productForm.navItemCode}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      navItemCode: event.target.value,
                    })
                  }
                  placeholder="Enter NAV item code"
                  required
                />
              </div>

              {/* ITEM DESCRIPTION */}

              <div className="space-y-2">
                <Label htmlFor="item-description">Item Description</Label>

                <Input
                  id="item-description"
                  value={productForm.itemDescription}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      itemDescription: event.target.value,
                    })
                  }
                  placeholder="Enter item description"
                  required
                />
              </div>

              {/* UOM */}

              <div className="space-y-2">
                <Label htmlFor="product-uom">UOM</Label>

                <select
                  id="product-uom"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={productForm.uom}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      uom: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select UOM</option>

                  {uoms.map((uom) => (
                    <option key={uom} value={uom}>
                      {uom}
                    </option>
                  ))}
                </select>
              </div>

              {/* UNIT RATE */}

              <div className="space-y-2">
                <Label htmlFor="unit-rate">Unit Rate</Label>

                <Input
                  id="unit-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.unitRate}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      unitRate: Number(event.target.value),
                    })
                  }
                  placeholder="Enter unit rate"
                  required
                />
              </div>

              <div className="space-y-3 sm:col-span-2">
                <Label htmlFor="product-image">Product Image</Label>

                <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
                    {productImagePreviewUrl ? (
                      <img
                        src={productImagePreviewUrl}
                        alt="Selected product"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="space-y-3">
                    <Input
                      key={productImageInputKey}
                      id="product-image"
                      type="file"
                      accept={productImageExtensions.join(",")}
                      onChange={handleProductImageChange}
                    />

                    <p className="text-xs text-muted-foreground">
                      Optional JPG, JPEG, PNG, WEBP, or GIF image.
                    </p>

                    {productImageFile ? (
                      <SelectedFileRow
                        icon={<ImageIcon className="h-4 w-4" />}
                        label={productImageFile.name}
                        onRemove={removeProductImage}
                      />
                    ) : null}

                    {productImageError ? (
                      <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {productImageError}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {productMessage?.tone === "destructive" ? (
              <FormMessageBanner message={productMessage} />
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={createProduct.isPending || Boolean(productImageError)}
              >
                {createProduct.isPending ? "Creating..." : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormMessageBanner({ message }: { message: FormMessage }) {
  const toneClasses =
    message.tone === "success"
      ? "border-success/25 bg-success/10 text-success"
      : "border-destructive/25 bg-destructive/10 text-destructive";

  return <div className={`rounded-md border px-3 py-2 text-sm ${toneClasses}`}>{message.text}</div>;
}

function SelectedFileRow({
  icon,
  label,
  onRemove,
}: {
  icon: ReactNode;
  label: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ProductImageThumbnail({ product }: { product: ProductResponse }) {
  const [failed, setFailed] = useState(false);
  const src = product.imagePath && !failed ? getApiAssetUrl(product.imagePath) : "";

  if (!src) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground">
        <ImageIcon className="h-5 w-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={product.itemDescription || "Product image"}
      className="h-12 w-12 rounded-md border border-border object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function formatMoney(value?: number) {
  if (typeof value !== "number") {
    return "-";
  }

  return `INR ${value.toLocaleString("en-IN")}`;
}
