import { describe, it, expect, vi, beforeEach } from "vitest";
import * as cheerio from "cheerio";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { scrapeConference, scrapeAcceptedPapers } = await import("../src/researchr-scraper.js");

const CONFERENCE_HTML = `
<!DOCTYPE html>
<html>
<head><title>ICSE 2026 - conf.researchr.org</title></head>
<body>
  <h1 class="conf-title">ICSE 2026</h1>
  <div class="conference-name">48th International Conference on Software Engineering</div>
  <div class="conference-info">
    <span class="location">Rio de Janeiro, Brazil</span>
    <span class="dates">April 12-18, 2026</span>
  </div>
  <div class="tracks">
    <div class="track">
      <a href="/track/icse-2026-research-track">Research Track</a>
    </div>
    <div class="track">
      <a href="/track/icse-2026-industry-track">Industry Track</a>
    </div>
  </div>
  <div class="important-dates">
    <div class="date-item">
      <span class="date-label">Abstract Submission</span>
      <span class="date-value">October 1, 2025</span>
    </div>
  </div>
</body>
</html>
`;

const ACCEPTED_PAPERS_HTML = `
<!DOCTYPE html>
<html>
<body>
  <div class="accepted-papers">
    <div class="paper-item">
      <span class="paper-title">Automated Bug Detection with AI</span>
      <span class="paper-authors">Alice Smith, Bob Jones</span>
    </div>
    <div class="paper-item">
      <span class="paper-title">Formal Verification of Smart Contracts</span>
      <span class="paper-authors">Charlie Brown</span>
    </div>
  </div>
</body>
</html>
`;

describe("Researchr Scraper", () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("scrapeConference should fetch and parse conference page", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => CONFERENCE_HTML,
        });

        const conference = await scrapeConference("icse-2026");
        expect(conference).toBeDefined();
        expect(conference.name).toBeDefined();
        expect(typeof conference.name).toBe("string");
    });

    it("scrapeConference should throw on HTTP error", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: "Not Found",
        });

        await expect(scrapeConference("nonexistent-conf")).rejects.toThrow();
    });

    it("scrapeAcceptedPapers should fetch and parse accepted papers", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: async () => ACCEPTED_PAPERS_HTML,
        });

        const papers = await scrapeAcceptedPapers("https://conf.researchr.org/track/icse-2026/research-track");
        expect(papers).toBeDefined();
        expect(Array.isArray(papers)).toBe(true);
    });
});
