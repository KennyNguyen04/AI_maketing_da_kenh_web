/**
 * All AI prompt templates used across the application.
 * Separated from business logic for easy iteration and A/B testing.
 *
 * Updated 15jul 2026:
 *   - Redesign prompts cho 3 kênh đang bật: x, facebook, threads.
 *     Tiêu chí người dùng đặt ra: "áp dụng giọng văn với độ dài hợp lí cho mỗi kênh".
 *     - Đặt persona (Brand Vault) lên PRIORITY #1 ngay đầu mỗi template.
 *     - Độ dài điều chỉnh theo platform norms 2026 (sweet-spot engagement, không phải ceiling).
 *     - Thêm "good vs avoid" examples cụ thể để AI bám sát pattern thay vì checklist khô.
 *     - Cho phép persona override một số ràng buộc channel (giọng văn là trên hết).
 *   - 15jul: đồng bộ 'twitter' (id form gửi) với 'x' (id code dùng) — cùng prompt
 *     để tránh tình trạng "X chỉ có 1 dòng" do form gửi 'twitter' mà prompt mới
 *     chỉ redesign cho 'x'.
 *   - 15jul: thêm hard minimum 70 chars + section "HOÀN THIỆN ĐỦ 70 CHARS" cho X.
 *     Lý do: output "Hà Nội đang biến KHCN&ĐMST thành đứa con tinh thần có KPI"
 *     (62 chars) đạt insight nhưng quá ngắn — sweet-spot chỉ là gợi ý mềm nên
 *     Gemini bỏ qua khi persona analytical/news-style. Hard minimum + hướng dẫn
 *     pad bằng context/punchline/example (không hashtag-spam) để hit ≥ 70 chars.
 *   - 15jul: siết Facebook sweet-spot 80-150 → 50-90 từ, KHÔNG vượt 120 từ.
 *     Lý do: user feedback "FB ngắn lại một chút" — output cũ ~110-120 từ/4 đoạn
 *     dài hơn mức feed FB tối ưu. Ví dụ mẫu cũng cắt gọn để model bám pattern.
 *
 * Updated 14jul 2026:
 *   - length floor ≥ 150 từ cho FB/Instagram/LinkedIn (user yêu cầu)
 *   - thêm facebook-group + threads (automator đã có, prompt thiếu)
 *   - thêm ràng buộc "mỗi câu ≥ 8 từ", "≥ 3 đoạn văn" cho long-form channels
 */

// ─── Brand Voice Analysis (from text sample) ───
export const VOICE_ANALYSIS_PROMPT = `
Bạn là một chuyên gia Content Marketing. Nhiệm vụ của bạn là phân tích "Giọng Văn" (Voice Profile) của tác giả dựa trên văn bản mẫu dưới đây.
Hãy xuất kết quả DƯỚI DẠNG JSON. Bắt buộc phải tuân thủ chính xác schema này (không thêm bớt key):

{
  "tone": ["tính_từ_1", "tính_từ_2", "tính_từ_3"], // Tối đa 5 tính từ miêu tả giọng điệu (VD: "chuyên nghiệp", "hài hước", "gần gũi")
  "sentence_style": "short|medium|long|varied",  // Chọn 1 trong 4
  "avg_sentence_length": 15,                     // Số từ trung bình mỗi câu (ước lượng)
  "signature_phrases": ["cụm_1", "cụm_2"],       // Các cụm từ đặc trưng hay dùng (nếu có)
  "topics": ["chủ_đề_1", "chủ_đề_2"],            // Các chủ đề chính được nhắc đến
  "avoid": ["tránh_1", "tránh_2"],               // Những thứ tác giả dường như tránh dùng (VD: "emoji", "thuật ngữ phức tạp")
  "system_prompt_cache": "..."                   // Viết 1 đoạn prompt hoàn chỉnh để AI khác có thể đóng vai tác giả này (bắt đầu bằng 'Bạn là...')
}

--- VĂN BẢN MẪU: ---
`

// ─── Brand Voice Analysis (from form questionnaire) ───
export const VOICE_FROM_FORM_PROMPT = `
Bạn là một chuyên gia Content Marketing. Dưới đây là khảo sát về giọng văn của một tác giả:
1. Chủ đề thường viết: {topics}
2. Giọng văn thiên về: {tone}
3. Đối tượng độc giả: {audience}
4. Văn phong đặc trưng: {style}
5. Câu mẫu yêu thích: {samples}

Nhiệm vụ của bạn là tổng hợp các câu trả lời khảo sát này thành một "Giọng Văn" (Voice Profile) hoàn chỉnh của tác giả dưới dạng JSON.
Bắt buộc phải tuân thủ chính xác schema này (không thêm bớt key):

{
  "tone": ["tính_từ_1", "tính_từ_2", "tính_từ_3"], // Hãy kết hợp tone được chọn và các tính từ phù hợp rút ra từ khảo sát (tối đa 5 tính từ)
  "sentence_style": "short|medium|long|varied",  // Chọn 1 trong 4 dựa trên văn phong và câu mẫu
  "avg_sentence_length": 15,                     // Số từ trung bình mỗi câu dựa trên câu mẫu và phong cách (ước lượng)
  "signature_phrases": ["cụm_1", "cụm_2"],       // Rút ra từ câu mẫu hoặc chủ đề (tối đa 5 cụm)
  "topics": ["chủ_đề_1", "chủ_đề_2"],            // Các chủ đề chính từ câu trả lời của tác giả
  "avoid": ["tránh_1", "tránh_2"],               // Những thứ tác giả nên tránh dựa trên giọng văn/độc giả của họ (VD: tránh thuật ngữ chuyên môn quá sâu, tránh emoji nếu học thuật, v.v.)
  "system_prompt_cache": "..."                   // Viết 1 đoạn prompt chi tiết (ít nhất 100 từ) mô tả chi tiết giọng văn để AI khác có thể đóng vai tác giả này khi tạo nội dung (bắt đầu bằng 'Bạn là...')
}
`

// ─── Content Repurposing (per channel) ───
// Updated 14jul: mỗi kênh long-form (FB/Instagram/LinkedIn) yêu cầu ≥ 150 từ.
// Channel có giới hạn cứng (X/Twitter) giữ < 280 ký tự.
export const REPURPOSE_PROMPT_TEMPLATES: Record<string, string> = {
  'linkedin_post': `Yêu cầu:
- Độ dài: 200-400 từ (LinkedIn algorithm ưu tiên bài ≥ 150 từ).
- Bắt đầu bằng một câu hook mạnh (không bắt đầu bằng "Tôi" — bắt đầu bằng insight/observation).
- Có 2-3 insight chính (có thể dùng danh sách bullet hoặc numbered).
- Kết thúc bằng một câu hỏi để tạo engagement.
- Không dùng quá 3 hashtag (viết HOA hoặc PascalCase).
- Hạn chế emoji, ưu tiên nội dung có giá trị.
- Mỗi câu ≥ 8 từ, tối thiểu 3 đoạn văn.
- Giữ đúng giọng văn đã chỉ định trong system prompt.`,

  'linkedin_thread': `Yêu cầu:
Viết một LinkedIn thread gồm 5-7 posts ngắn.
Mỗi post có insight riêng, KHÔNG lặp nội dung giữa các post.
Post 1: Hook + setup vấn đề (không bắt đầu bằng "Tôi").
Post 2-5: Mỗi post là một insight hoặc bước cụ thể.
Post cuối: Takeaway + CTA (follow / comment / share).
Phân cách mỗi post bằng "---".
Mỗi post không quá 300 ký tự.`,

  'linkedin_carousel': `Yêu cầu:
Viết nội dung cho một LinkedIn carousel (slide deck).
Format: Mỗi slide cách nhau bằng "---SLIDE---"
Slide 1: Title (tiêu đề hấp dẫn)
Slide 2-8: Nội dung mỗi slide (tối đa 200 ký tự — nâng từ 150)
Slide cuối: CTA + hashtags
Tổng cộng 8-10 slides.
Không emoji, giữ chuyên nghiệp.`,

  'facebook': `Nguyên tắc cao nhất: GIỌNG VĂN TÁC GIẢ là trên hết. Nếu persona chỉ định tone khác (ví dụ "chuyên gia phân tích"), hãy ưu tiên tone đó — chỉ giữ cấu trúc và độ dài theo channel rules dưới đây.

Viết một Facebook Page post dựa trên bài viết gốc.

### ĐỘ DÀI
- Sweet-spot 50-90 từ. Feed FB hiển thị tốt nhất trong khoảng này (engagement giảm dần sau 100 từ — người đọc feed FB quét rất nhanh).
- KHÔNG vượt 120 từ trong mọi trường hợp — kể cả khi persona hoặc nội dung gốc đòi hỏi kể chuyện dài. Nếu source dài, hãy CHỌN 1 insight trọng tâm rồi viết gọn lại.
- PHẢI có dòng ngắt ("\n\n") giữa hook / body / CTA để người đọc quét nhanh.

### CẤU TRÚC (3 phần, giữ gọn)
1. Hook (1 câu, ≤ 15 từ): gây tò mò hoặc đánh vào insight — quyết định người đọc có bấm "...xem thêm".
2. Thân bài: 1 insight chính hoặc 1 quan sát ngắn (1 đoạn, 2-3 câu, mỗi câu 8-15 từ).
3. CTA nhẹ: 1 câu hỏi hoặc 1 lời mời tương tác.

### GIỌNG VĂN (áp dụng từ Brand Vault)
- Casual, kể chuyện, như đang nói chuyện với 1 người bạn.
- Mỗi câu ≥ 8 từ (tránh tweet-style one-liner).
- Emoji: 1-3 cái, đặt ở đầu/cuối hook — không rải khắp bài.

### PATTERNS NÊN TRÁNH
- KHÔNG bắt đầu bằng "Tôi", "Chúng ta", "Hôm nay".
- KHÔNG bullet-list khô khan (3 dấu đầu dòng trở lên trông như slide deck).
- KHÔNG nhồi keyword bài gốc quá 1 lần / 1 trọng tâm.

### HASHTAG
- 1-3 hashtag ở cuối (viết HOA hoặc PascalCase, vd #Marketing, #ContentStrategy).
- Nếu persona nghiêng về giọng bình dân hoặc micro-niche, có thể bỏ hashtag hoàn toàn.

### VÍ DỤ MẪU (không copy, chỉ tham khảo format — mục tiêu 50-90 từ)
"Đa số founder Việt đang đốt tiền cho content mà không có chiến lược. Đăng đều đặn, nhưng không đo lường — kết quả là post nào cũng giống post nào, audience ngày càng loãng.

Mình từng rơi vào đúng cái bẫy này. 1 bài có chiến lược ăn đứt 10 bài đăng đều nhưng vô hồn.

Bạn đang đăng đều — hay đăng có chiến lược?

#ContentStrategy #Marketing"`,

  'facebook-group': `Yêu cầu:
Viết một bài đăng cho Facebook Group (cộng đồng).
Độ dài: 200-400 từ.
Tone thân thiện, cộng đồng, khuyến khích thảo luận.
Mở đầu bằng hook thu hút, có insight chia sẻ, kết thúc bằng câu hỏi gợi mở cho group members.
Mỗi câu ≥ 8 từ, tối thiểu 3 đoạn văn.
1-3 hashtag ở cuối (viết HOA hoặc PascalCase).
Tránh ngôn ngữ quá bán hàng — group members ghét quảng cáo lộ liễu.`,

  // 'twitter' và 'x' là cùng 1 channel — form chọn 'twitter' (label 'X'),
  // prompt + config giống nhau để draft chuẩn 70-130 chars theo persona.
  'twitter': `Nguyên tắc cao nhất: GIỌNG VĂN TÁC GIẢ là trên hết. X là "personality contest" — cùng 1 thông điệp có thể viết 10 cách khác nhau theo 10 persona. Hãy theo persona đến chữ cuối.

Viết 1 X post (single tweet, không phải thread) dựa trên bài viết gốc.

### ĐỘ DÀI (tính theo KÝ TỰ, không phải từ)
- Tối đa 280 ký tự (giới hạn cứng của X).
- TỐI THIỂU 70 ký tự — dưới 70 ký tự X xử lý như "low-effort" và giảm reach.
  KHÔNG ĐƯỢC output ngắn hơn 70 chars kể cả khi persona analytical/news-style
  (như "Hà Nội đang biến KHCN&ĐMST thành đứa con tinh thần có KPI" — 62 chars — là quá ngắn).
- Sweet-spot 70-130 ký tự — engagement cao nhất rơi vào khoảng này, vì feed X đọc theo "shooting glance" không theo chiều dọc.
- Nếu nội dung thật sự phức tạp và persona cho phép dài hơn, có thể lên 200-260 ký tự — nhưng phải có 1 punchline mạnh ở cuối.

### HOÀN THIỆN ĐỦ 70 CHARS
Nếu insight đã chốt gọn trong < 70 chars, PHẢI thêm 1 trong:
- 1 dòng context ngắn (1-2 câu phụ) để người đọc hiểu vì sao insight quan trọng.
- 1 punchline kết (cảm xúc / hành động / câu hỏi ngắn, KHÔNG phải "Thoughts?/Agree?").
- 1 ví dụ cụ thể (con số, tên dự án, ngày tháng) để tăng density.
KHÔNG được pad bằng hashtag hay emoji-spam — chỉ thêm nội dung có giá trị.

### CẤU TRÚC
- 1 insight duy nhất (không nhồi).
- Hook ở đầu: 5-10 ký tự đầu quyết định người đọc có dừng cuộn hay không.
- Nếu dùng emoji, chỉ 1-2 cái, đặt ở hook hoặc punchline.

### PATTERNS NÊN DÙNG
- Format "đảo ngược": câu đầu chốt insight, giải thích ngắn sau.
- Format "listicle thu nhỏ": gom 3-4 thứ vào 1 dòng phân cách dấu "•" hoặc "→".
- Format "contrarian": đi ngược số đông, nhưng đừng quá clickbait.
- Format "story hook": mở đầu bằng 1 câu chuyện cá nhân rồi rút insight.

### PATTERNS NÊN TRÁNH
- KHÔNG bắt đầu bằng "Tôi nghĩ", "Theo tôi", "Bạn có biết".
- KHÔNG kết thúc bằng "Thoughts?" hoặc "Agree?" (lazy).
- KHÔNG hashtag nếu persona không phải dạng broadcast / corporate.
- KHÔNG bullet-list nhiều dòng — X đọc rất tệ với whitespace dọc.

### VÍ DỤ MẪU (không copy, chỉ tham khảo)
- "Hot take: Bạn không cần content calendar. Bạn cần 3 bài đủ tốt mỗi tuần. Calendar là để tự lừa mình rằng mình 'đang làm content'."
- "Mình đã viết 500 bài LinkedIn. Bài hay nhất? Bài 7 từ. Hay nhất = ngắn nhất."`,

  // Giữ 'x' như alias ổn định cho DB/code gọi trực tiếp; nội dung y hệt 'twitter'.
  'x': `Nguyên tắc cao nhất: GIỌNG VĂN TÁC GIẢ là trên hết. X là "personality contest" — cùng 1 thông điệp có thể viết 10 cách khác nhau theo 10 persona. Hãy theo persona đến chữ cuối.

Viết 1 X post (single tweet, không phải thread) dựa trên bài viết gốc.

### ĐỘ DÀI (tính theo KÝ TỰ, không phải từ)
- Tối đa 280 ký tự (giới hạn cứng của X).
- TỐI THIỂU 70 ký tự — dưới 70 ký tự X xử lý như "low-effort" và giảm reach.
  KHÔNG ĐƯỢC output ngắn hơn 70 chars kể cả khi persona analytical/news-style
  (như "Hà Nội đang biến KHCN&ĐMST thành đứa con tinh thần có KPI" — 62 chars — là quá ngắn).
- Sweet-spot 70-130 ký tự — engagement cao nhất rơi vào khoảng này, vì feed X đọc theo "shooting glance" không theo chiều dọc.
- Nếu nội dung thật sự phức tạp và persona cho phép dài hơn, có thể lên 200-260 ký tự — nhưng phải có 1 punchline mạnh ở cuối.

### HOÀN THIỆN ĐỦ 70 CHARS
Nếu insight đã chốt gọn trong < 70 chars, PHẢI thêm 1 trong:
- 1 dòng context ngắn (1-2 câu phụ) để người đọc hiểu vì sao insight quan trọng.
- 1 punchline kết (cảm xúc / hành động / câu hỏi ngắn, KHÔNG phải "Thoughts?/Agree?").
- 1 ví dụ cụ thể (con số, tên dự án, ngày tháng) để tăng density.
KHÔNG được pad bằng hashtag hay emoji-spam — chỉ thêm nội dung có giá trị.

### CẤU TRÚC
- 1 insight duy nhất (không nhồi).
- Hook ở đầu: 5-10 ký tự đầu quyết định người đọc có dừng cuộn hay không.
- Nếu dùng emoji, chỉ 1-2 cái, đặt ở hook hoặc punchline.

### PATTERNS NÊN DÙNG
- Format "đảo ngược": câu đầu chốt insight, giải thích ngắn sau.
- Format "listicle thu nhỏ": gom 3-4 thứ vào 1 dòng phân cách dấu "•" hoặc "→".
- Format "contrarian": đi ngược số đông, nhưng đừng quá clickbait.
- Format "story hook": mở đầu bằng 1 câu chuyện cá nhân rồi rút insight.

### PATTERNS NÊN TRÁNH
- KHÔNG bắt đầu bằng "Tôi nghĩ", "Theo tôi", "Bạn có biết".
- KHÔNG kết thúc bằng "Thoughts?" hoặc "Agree?" (lazy).
- KHÔNG hashtag nếu persona không phải dạng broadcast / corporate.
- KHÔNG bullet-list nhiều dòng — X đọc rất tệ với whitespace dọc.

### VÍ DỤ MẪU (không copy, chỉ tham khảo)
- "Hot take: Bạn không cần content calendar. Bạn cần 3 bài đủ tốt mỗi tuần. Calendar là để tự lừa mình rằng mình 'đang làm content'."
- "Mình đã viết 500 bài LinkedIn. Bài hay nhất? Bài 7 từ. Hay nhất = ngắn nhất."`,

  'x_thread': `Yêu cầu:
Viết một X thread gồm 2-4 tweets liên tiếp.
Tweet 1: Hook để thu hút người đọc click vào thread
Tweet 2-3: Nội dung chính, mỗi tweet dưới 250 ký tự
Tweet cuối: Takeaway + CTA (follow, quote tweet, etc.)
Phân cách mỗi tweet bằng "---"
Có thể dùng emoji tự nhiên`,

  'instagram': `Yêu cầu:
Viết caption cho Instagram post.
Độ dài: 200-400 từ (đủ dài để giữ engagement > 3s).
Bắt đầu bằng hook CỰC MẠNH trong 2-3 dòng đầu (nếu hook yếu người đọc không bấm "...more").
Phần chính có giá trị (story, insight, hoặc value) — phải cho người đọc lý do keep-reading.
CTA ở cuối (bình luận / save / share / tag friend).
8-15 hashtags ở cuối (viết thường, cách nhau dấu cách).
Có thể dùng line breaks để dễ đọc.`,

  'threads': `Nguyên tắc cao nhất: GIỌNG VĂN TÁC GIẢ là trên hết. Threads là feed có tính "conversation" cao nhất — người đọc ghét cảm giác đang đọc "press release". Hãy viết như persona đang thoại chứ không phải "đăng bài".

Viết 1 Threads post (Meta's text-first platform, public feed) dựa trên bài viết gốc.

### ĐỘ DÀI (tính theo TỪ, vì Threads có thể dài)
- Sweet-spot 150-250 từ. Threads 2026 algorithm đẩy bài 100-200 từ lên đầu feed cho người dùng feed thường, và 200-350 từ cho người dùng feed "for you".
- Được phép lên 350-450 từ nếu persona kể chuyện dài (essayist style) — Threads cho phép đến 500 từ nên chừa buffer.
- Tối thiểu 80 từ. Dưới 80 từ Threads xử lý như "low-effort" và rank thấp.

### CẤU TRÚC
1. Hook 1-2 dòng đầu ("scroll-stopper"). Đây là phần quan trọng nhất vì Threads quyết định feed chỉ qua 1-2 dòng đầu.
2. Thân bài: 1 quan điểm / 1 câu chuyện / 1 takeaway. Mỗi đoạn cách nhau bằng dòng trống.
3. CTA cực nhẹ ở cuối: 1 câu hỏi hoặc "tag friend", hoặc bỏ qua nếu persona không phù hợp.

### GIỌNG VĂN (áp dụng từ Brand Vault, hơi khác FB ở chỗ Gen-Z friendly hơn)
- Casual, hội thoại, được phép dùng "mình", "bạn", xưng hô informal.
- Emoji: 1-3 cái, đặt hook. KHÔNG rải emoji 5-6 cái trong 100 từ (Threads có anti-pattern emoji-spam).
- Được phép câu ngắn hơn (5-6 từ) — không bắt buộc ≥8 từ/câu như FB.
- Được phép "line break ngẫu nhiên" — Threads chấp nhận rhythm ngắt quãng.

### HASHTAG
- 1-3 hashtag tối đa (KHÁC Instagram 8-15). Viết thường hoặc HOA đều được, vd #marketing #content.
- Nếu persona thuộc dạng "thought leader", hãy bỏ hashtag hoàn toàn — Threads 2026 algorithm giảm reach khi có hashtag quá 3 cái.

### PATTERNS NÊN DÙNG
- Format "rant-compress": bắt đầu bằng 1 cảm xúc mạnh → thu hẹp dần → 1 insight cuối.
- Format "polaroid": 1 mẩu cá nhân cụ thể → kéo ra thành bài học.
- Format "one-liner essay": hook mạnh, không đoạn, xuống 1-2 insight, kết.

### PATTERNS NÊN TRÁNH
- KHÔNG mở bằng "Bạn ơi", "Mọi người ơi" (Threads karma giảm).
- KHÔNG kết bằng "Thoughts?", "Agree?", "Repost if..." (nghĩa là đang cố viral explicit).
- KHÔNG emoji-per-sentence — đặt 1-3 cái ở hook là đủ.
- KHÔNG chèn link trong thân bài (Threads reach giảm 80% nếu có outbound link).

### VÍ DỤ MẪU (không copy, chỉ tham khảo format)
"Hôm qua mình đóng cửa 1 dự án 8 tháng. Không phải vì hết tiền. Mà vì mình nhận ra đang xây cho người không tồn tại.

Mình ngồi lại, đọc toàn bộ các comment, tin nhắn, email từ 8 tháng qua.

Kết luận: 80% các kênh mình tưởng 'quan trọng' chỉ là echo chamber của chính mình. Người mua thật đến từ 2 chỗ duy nhất — và 2 chỗ đó mình đã lờ đi vì 'không glam'.

Bài học: data nói dối. Còn khách hàng thật thì không."`,
}