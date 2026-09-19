"""Build a public copy of the supplied modeling archive; never execute its code."""
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("archive", type=Path)
parser.add_argument("paper", type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
destination = root / "src/assets/downloads/radio-localization-support-public.zip"
destination.parent.mkdir(parents=True, exist_ok=True)
retained, excluded, identifiers = [], [], set()
with zipfile.ZipFile(args.archive) as source:
    entries = []
    for entry in source.infolist():
        if entry.is_dir():
            continue
        data = source.read(entry)
        if entry.filename.lower().endswith(".jlog"):
            excluded.append(entry.filename)
            header = data[:16384].decode("utf-8", errors="ignore")
            identifiers.update(re.findall(r'"team_no"\s*:\s*"([^"\n]+)"', header))
            continue
        assert not entry.filename.startswith(("/", "\\")) and ".." not in entry.filename.split("/"), "Unsafe archive path"
        entries.append((entry.filename, data))
    assert len(excluded) == 6, "Expected six private official behavior logs"
    for name, data in entries:
        assert not any(identifier.encode() in data for identifier in identifiers), f"Identifier remains in {name}"
        assert not re.search(rb'(?:ghp_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY)', data), f"Credential in {name}"
        retained.append({"path": name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
    paper_text = __import__('subprocess').check_output(['pdftotext', '-enc', 'UTF-8', str(args.paper), '-'])
    assert not any(identifier.encode() in paper_text for identifier in identifiers), "Identifier appears in paper"
    notice = '''# Public supporting materials / 公开版支撑材料

2026 CUMCM Problem B: radio-interference localization and clearance.
2026 年高教社杯全国大学生数学建模竞赛 B 题：无线电干扰源定位与清除。

This public copy retains the supplied code, result tables, offline summaries,
figure/table evidence ledgers, and AI-use statement byte-for-byte.
Six encrypted .jlog files are omitted because their headers contain the team identifier.
References to those logs in the original documentation describe the private submission archive.
The original archive and original logs have not been modified.

公开版逐字节保留原有代码、结果表、离线汇总、图表证据索引及 AI 工具使用说明。
六份加密 .jlog 文件因文件头包含参赛队号而未纳入公开版。
原说明中提到的这些日志属于私有提交归档；原始压缩包与日志未作修改。

Results are retained submission outputs, not new runs. Offline benchmarks and
official simulator tests are separate evidence. No simulator is included here.
Some original figure scripts refer to publication_assets or generated_tables
paths from the author's working tree; map those inputs to 数据与结果 before use.
Official runners require the separate simulator and a runtime identifier;
downloading or extracting this package does not start them.

结果为提交时留存输出，本次发布未重新运行算法或官方测试。
离线基准与官方模拟器测试分别展示。此包不包含官方模拟器。
部分原始绘图脚本依赖原工作目录路径，使用前需对照“数据与结果”调整输入路径。
官方运行入口依赖另行提供的模拟器及运行标识；解压不会自动启动测试。

PUBLIC-MANIFEST.json records SHA-256 values for every retained original file.
'''
    manifest = {"sourceArchiveSha256": hashlib.sha256(args.archive.read_bytes()).hexdigest(),
                "paperSha256": hashlib.sha256(args.paper.read_bytes()).hexdigest(),
                "excludedReason": "Official encrypted log headers contain the team identifier.",
                "excludedFiles": excluded, "retainedFiles": retained}
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as public:
        for name, data in entries:
            info = zipfile.ZipInfo(name, date_time=(2026, 9, 19, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            public.writestr(info, data)
        public.writestr("PUBLIC-README.md", notice)
        public.writestr("PUBLIC-MANIFEST.json", json.dumps(manifest, ensure_ascii=False, indent=2))
print(json.dumps({"retainedOriginalFiles":len(retained),"excludedLogs":len(excluded),"privateIdentifiersChecked":len(identifiers),"publicBytes":destination.stat().st_size},ensure_ascii=False))
