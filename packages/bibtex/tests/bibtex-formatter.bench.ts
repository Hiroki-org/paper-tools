import { bench, describe } from "vitest";
import { formatBibtex } from "../src/bibtex-formatter.js";

const rawEntry = `@article{tmp,
  author={Alice Smith and Bob Jones and Charlie Brown and David Wilson and Eve Davis},
  title={A Sample Paper with Many Fields to Format},
  journal={Journal of Testing},
  booktitle={Proceedings of the Testing Conference},
  year={2024},
  doi={10.1234/5678},
  url={https://example.com},
  abstract={This is a long abstract for the sample paper.},
  keywords={testing, vitest, performance},
  note={A note},
  pages={1--10},
  volume={1},
  number={1},
  publisher={Testing Publisher},
  address={Testing City},
  month={1},
  issn={1234-5678},
  isbn={1234-5678},
  series={Testing Series},
  edition={1},
  chapter={1}
}`;

describe("bibtex-formatter", () => {
	bench("formatBibtex with many fields", () => {
		formatBibtex(rawEntry);
	});
});
