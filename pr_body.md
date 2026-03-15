🎯 **What:** `packages/core/src/openalex-client.ts` の `scoreCandidate` 関数に対する単体テストを追加しました。テストを可能にするため、関数を `export` しています。
📊 **Coverage:** 以下のシナリオがテストでカバーされています：
*   ORCIDの完全一致（100点）と大文字小文字の区別なし
*   名前の完全一致（40点）と部分一致（20点）
*   所属機関の一致（`last_known_institutions` または `affiliations`）（15点）
*   `works_count` に基づく追加ポイント（最大15点）とその上限、および部分ポイント
*   複数の条件が組み合わさった場合の合計スコア
*   引数が不足している場合のエッジケース（0点）
✨ **Result:** OpenAlexクライアントのコアとなるマッチングアルゴリズム（`scoreCandidate`）が12個のテストケースで完全にカバーされ、テストカバレッジと信頼性が向上しました。
