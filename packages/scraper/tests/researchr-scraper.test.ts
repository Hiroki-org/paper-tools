import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { scrapeConference, scrapeAcceptedPapers } = await import(
	"../src/researchr-scraper.js"
);

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
	it("should extract important dates from tables", async () => {
		const htmlWithTable = `
      <html>
        <head><title>Test Conf 2024</title></head>
        <body>
          <h1 class="conf-title">Test Conference 2024</h1>
          <div class="conference-dates">October 12-16, 2024</div>
          <div class="conference-location">Tokyo, Japan</div>
          <div class="track"><a href="/track/main">Main Track</a></div>
          <table>
            <tr>
              <td>Abstract Submission Deadline</td>
              <td>March 15, 2024</td>
            </tr>
            <tr>
              <td>Notification of Acceptance</td>
              <td>May 1, 2024</td>
            </tr>
          </table>
        </body>
      </html>
    `;
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () => htmlWithTable,
		});

		const result = await scrapeConference("testconf-2024");
		expect(result.importantDates).toEqual([
			{ description: "Abstract Submission Deadline", date: "March 15, 2024" },
			{ description: "Notification of Acceptance", date: "May 1, 2024" },
		]);
	});

	it("should extract important dates from lists", async () => {
		const htmlWithList = `
      <html>
        <head><title>Test Conf 2024</title></head>
        <body>
          <h1 class="conf-title">Test Conference 2024</h1>
          <div class="conference-dates">October 12-16, 2024</div>
          <div class="conference-location">Tokyo, Japan</div>
          <div class="track"><a href="/track/main">Main Track</a></div>
          <ul>
            <li class="important-date">Submission: March 15, 2024</li>
            <li class="important-date">March 16, 2024: Notification</li>
          </ul>
        </body>
      </html>
    `;
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () => htmlWithList,
		});

		const result = await scrapeConference("testconf-2024");
		expect(result.importantDates).toEqual([
			{ description: "Submission", date: "March 15, 2024" },
			{ description: "Notification", date: "March 16, 2024" },
		]);
	});

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
		expect(conference.name).toBe("ICSE 2026");
		expect(conference.year).toBe(2026);
		expect(conference.tracks.length).toBeGreaterThan(0);
	});

	it("scrapeConference should throw on HTTP error", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 404,
			statusText: "Not Found",
		});

		await expect(scrapeConference("nonexistent-conf")).rejects.toThrow();
	});

	it("scrapeAcceptedPapers should reject invalid URLs", async () => {
		await expect(scrapeAcceptedPapers("invalid-url")).rejects.toThrow(
			"Invalid URL provided",
		);
		await expect(
			scrapeAcceptedPapers("http://malicious.com/track/1"),
		).rejects.toThrow("URL must be a researchr.org domain");
		await expect(scrapeAcceptedPapers("javascript:alert(1)")).rejects.toThrow(
			"URL must be a researchr.org domain",
		);
	});

	it("scrapeAcceptedPapers should fetch and parse accepted papers", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			text: async () => ACCEPTED_PAPERS_HTML,
		});

		const papers = await scrapeAcceptedPapers(
			"https://conf.researchr.org/track/icse-2026/research-track",
		);
		expect(papers).toBeDefined();
		expect(Array.isArray(papers)).toBe(true);
		expect(papers.length).toBe(2);
		expect(papers[0]?.title).toBe("Automated Bug Detection with AI");
		expect(papers[0]?.authors.map((a) => a.name)).toEqual([
			"Alice Smith",
			"Bob Jones",
		]);
	});
});
