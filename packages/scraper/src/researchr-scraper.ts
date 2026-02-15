import * as cheerio from "cheerio";
import type { Conference, ConferenceTrack, ImportantDate, Paper } from "@paper-tools/core";
import { fetchWithRetry } from "@paper-tools/core";

const RESEARCHR_BASE = "https://conf.researchr.org";

/**
 * conf.researchr.org のカンファレンスホームページをスクレイピングして
 * カンファレンス情報を取得する
 */
export async function scrapeConference(
    conferenceSlug: string,
): Promise<Conference> {
    const url = `${RESEARCHR_BASE}/home/${conferenceSlug}`;
    const response = await fetchWithRetry(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // カンファレンス名を取得
    const name = $("h1.banner-text, .conf-title, h1").first().text().trim() || conferenceSlug;

    // フルネームを取得（メタタグやページタイトルから）
    const fullName = $('meta[property="og:title"]').attr("content")
        || $("title").text().trim()
        || name;

    // 日付情報を取得
    const dateText = $(".conference-dates, .date-info, .banner-date").first().text().trim();

    // 場所情報を取得
    const location = $(".conference-location, .location-info, .banner-location").first().text().trim()
        || extractLocation($);

    // トラック情報を取得
    const tracks = extractTracks($, conferenceSlug);

    // 重要な日付を取得
    const importantDates = extractImportantDates($);

    // 年を抽出
    const yearMatch = conferenceSlug.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    // URL
    const confUrl = url;

    // 日付パース
    const { startDate, endDate } = parseDateRange(dateText, year);

    return {
        name,
        fullName,
        year,
        location: location || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        url: confUrl,
        tracks,
        importantDates,
    };
}

function extractLocation($: cheerio.CheerioAPI): string {
    // ページ本文からよくある場所パターンを探す
    const bodyText = $("body").text();
    const locationPatterns = [
        /held in ([^.]+)/i,
        /will take place in ([^.]+)/i,
        /location:\s*([^.\n]+)/i,
    ];
    for (const pattern of locationPatterns) {
        const match = bodyText.match(pattern);
        if (match) return match[1].trim();
    }
    return "";
}

function extractTracks($: cheerio.CheerioAPI, conferenceSlug: string): ConferenceTrack[] {
    const tracks: ConferenceTrack[] = [];
    const seen = new Set<string>();

    // ナビゲーションメニューやサイドバーからトラックリンクを探す
    $('a[href*="/track/"], .nav-link, .track-link, .sidebar a').each((_i, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr("href") || "";
        if (text && !seen.has(text) && text.length > 2 && text.length < 100) {
            seen.add(text);
            const trackUrl = href.startsWith("http") ? href : `${RESEARCHR_BASE}${href}`;
            tracks.push({ name: text, url: trackUrl });
        }
    });

    // トラックが見つからなかった場合、セクション見出しから探す
    if (tracks.length === 0) {
        $("h2, h3, h4").each((_i, el) => {
            const text = $(el).text().trim();
            if (
                text &&
                !seen.has(text) &&
                (text.toLowerCase().includes("track") ||
                    text.toLowerCase().includes("workshop") ||
                    text.toLowerCase().includes("tutorial") ||
                    text.toLowerCase().includes("symposium"))
            ) {
                seen.add(text);
                tracks.push({ name: text });
            }
        });
    }

    return tracks;
}

function extractImportantDates($: cheerio.CheerioAPI): ImportantDate[] {
    const dates: ImportantDate[] = [];
    const seen = new Set<string>();

    // テーブル形式の重要日程を探す
    $("table").each((_i, table) => {
        const tableText = $(table).text().toLowerCase();
        if (
            tableText.includes("date") ||
            tableText.includes("deadline") ||
            tableText.includes("submission") ||
            tableText.includes("notification")
        ) {
            $(table)
                .find("tr")
                .each((_j, row) => {
                    const cells = $(row).find("td, th");
                    if (cells.length >= 2) {
                        const description = $(cells[0]).text().trim();
                        const date = $(cells[1]).text().trim();
                        const key = `${description}:${date}`;
                        if (description && date && !seen.has(key)) {
                            seen.add(key);
                            dates.push({ date, description });
                        }
                    }
                });
        }
    });

    // リスト形式もチェック
    if (dates.length === 0) {
        $("li, .deadline, .important-date").each((_i, el) => {
            const text = $(el).text().trim();
            const datePatterns = [
                /(.+?):\s*(\w+ \d{1,2},?\s*\d{4})/,
                /(.+?)\s*[-–]\s*(\w+ \d{1,2},?\s*\d{4})/,
                /(\w+ \d{1,2},?\s*\d{4})\s*[-–:]\s*(.+)/,
            ];
            for (const pattern of datePatterns) {
                const match = text.match(pattern);
                if (match) {
                    const key = text;
                    if (!seen.has(key)) {
                        seen.add(key);
                        const isDateFirst = pattern.source.startsWith("(\\w+");
                        dates.push({
                            description: isDateFirst ? match[2].trim() : match[1].trim(),
                            date: isDateFirst ? match[1].trim() : match[2].trim(),
                        });
                    }
                    break;
                }
            }
        });
    }

    return dates;
}

function parseDateRange(
    dateText: string,
    _year: number,
): { startDate?: string; endDate?: string } {
    if (!dateText) return {};

    // "April 12-18, 2026" 形式
    const rangeMatch = dateText.match(
        /(\w+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(\d{4})/,
    );
    if (rangeMatch) {
        const month = rangeMatch[1];
        const startDay = rangeMatch[2];
        const endDay = rangeMatch[3];
        const yr = rangeMatch[4];
        return {
            startDate: `${month} ${startDay}, ${yr}`,
            endDate: `${month} ${endDay}, ${yr}`,
        };
    }

    // "October 12 - October 16, 2026" 形式
    const crossMonthMatch = dateText.match(
        /(\w+)\s+(\d{1,2})\s*[-–]\s*(\w+)\s+(\d{1,2}),?\s*(\d{4})/,
    );
    if (crossMonthMatch) {
        return {
            startDate: `${crossMonthMatch[1]} ${crossMonthMatch[2]}, ${crossMonthMatch[5]}`,
            endDate: `${crossMonthMatch[3]} ${crossMonthMatch[4]}, ${crossMonthMatch[5]}`,
        };
    }

    return {};
}

/**
 * conf.researchr.org のトラックページからAccepted Papersを取得する
 */
export async function scrapeAcceptedPapers(trackUrl: string): Promise<Paper[]> {
    const response = await fetchWithRetry(trackUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const papers: Paper[] = [];

    // Accepted papers セクションを探す
    $(".accepted-paper, .paper-entry, .paper-item, article.paper").each(
        (_i, el) => {
            const title =
                $(el).find(".title, h3, h4, .paper-title").first().text().trim();
            const authorText = $(el)
                .find(".authors, .paper-authors, .author-list")
                .first()
                .text()
                .trim();

            if (title) {
                const authors = authorText
                    ? authorText
                        .replace(/, and /gi, ", ")
                        .replace(/ and /gi, ", ")
                        .split(/[,;]/)
                        .map((a) => ({ name: a.trim() }))
                    : [];

                papers.push({
                    title,
                    authors: authors.filter((a) => a.name.length > 0),
                });
            }
        },
    );

    // テーブル形式のリストもチェック
    if (papers.length === 0) {
        $("table tr").each((_i, row) => {
            const cells = $(row).find("td");
            if (cells.length >= 1) {
                const title = $(cells[0]).text().trim();
                const authorText = cells.length >= 2 ? $(cells[1]).text().trim() : "";
                if (title && title.length > 10) {
                    const authors = authorText
                        ? authorText
                            .replace(/, and /gi, ", ")
                            .replace(/ and /gi, ", ")
                            .split(/[,;]/)
                            .map((a) => ({ name: a.trim() }))
                        : [];
                    papers.push({
                        title,
                        authors: authors.filter((a) => a.name.length > 0),
                    });
                }
            }
        });
    }

    return papers;
}
