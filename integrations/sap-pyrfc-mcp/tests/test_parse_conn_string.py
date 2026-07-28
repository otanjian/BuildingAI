"""Tests for ERP-style conn= string parsing."""

from sap_pyrfc_mcp.config import parse_conn_string


def test_parse_conn_goodsap_style():
    out = parse_conn_string(
        "conn=/H/sap.goodsap.cn/S/3200&clnt=200&user=S2385&lang=zh"
    )
    assert out["ashost"] == "sap.goodsap.cn"
    assert out["sysnr"] == "00"
    assert out["client"] == "200"
    assert out["user"] == "S2385"
    assert out["language"] == "ZH"
    assert "saprouter" not in out


def test_parse_conn_without_prefix():
    out = parse_conn_string("/H/host.example/S/3201&client=100&user=X&lang=EN")
    assert out["ashost"] == "host.example"
    assert out["sysnr"] == "01"
    assert out["client"] == "100"
    assert out["user"] == "X"


def test_parse_semicolon_style():
    out = parse_conn_string("ashost=h1;sysnr=00;client=200;user=U;passwd=secret")
    assert out["ashost"] == "h1"
    assert out["sysnr"] == "00"
    assert out["client"] == "200"
    assert out["user"] == "U"
    assert out["password"] == "secret"


def test_empty():
    assert parse_conn_string("") == {}
    assert parse_conn_string("   ") == {}
