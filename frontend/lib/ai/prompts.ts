/**
 * All AI prompt templates used across the application.
 * Separated from business logic for easy iteration and A/B testing.
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
export const REPURPOSE_PROMPT_TEMPLATES: Record<string, string> = {
  'linkedin_post': `Yêu cầu:
- Độ dài: 150-300 từ
- Bắt đầu bằng một câu hook mạnh (không bắt đầu bằng "Tôi")
- Có 1-2 insight chính
- Kết thúc bằng một câu hỏi để tạo engagement
- Không dùng quá 3 hashtag (viết HOA hoặc PascalCase)
- Hạn chế emoji, ưu tiên nội dung có giá trị
- Giữ đúng giọng văn đã chỉ định trong system prompt`,

  'linkedin_thread': `Yêu cầu:
Viết một LinkedIn thread gồm 5-7 posts ngắn.
Post 1: Hook + setup vấn đề
Post 2-5: Mỗi post là một insight hoặc bước
Post cuối: Takeaway + CTA
Phân cách mỗi post bằng "---"
Mỗi post không quá 300 ký tự.`,

  'linkedin_carousel': `Yêu cầu:
Viết nội dung cho một LinkedIn carousel (slide deck).
Format: Mỗi slide cách nhau bằng "---SLIDE---"
Slide 1: Title (tiêu đề hấp dẫn)
Slide 2-8: Nội dung mỗi slide (tối đa 150 ký tự)
Slide cuối: CTA + hashtags
Tổng cộng 8-10 slides.
Không emoji, giữ chuyên nghiệp.`,

  'facebook': `Yêu cầu:
Viết một Facebook post casual, kể chuyện, gần gũi.
Độ dài 200-400 từ.
Có thể dùng emoji một cách tự nhiên (1-3 emoji per post)
Có hook ở đầu để thu hút attention
Kết thúc bằng câu hỏi hoặc CTA nhẹ nhàng
1-5 hashtags ở cuối`,

  'twitter': `Yêu cầu:
Viết một tweet ngắn dưới 280 ký tự.
Hook mạnh, một insight duy nhất.
Có thể dùng emoji một cách có chọn lọc (1-2 emoji)
Không hashtag hoặc tối đa 1 hashtag
Thoại tự nhiên, không quá formal`,

  'x': `Yêu cầu:
Viết một X post ngắn dưới 280 ký tự.
Hook gây tò mò hoặc gây debate nhẹ.
Một insight hoặc opinion rõ ràng.
Emoji được khuyến khích (1-3 emoji)
Không hashtag hoặc tối đa 1 hashtag
Có thể kết thúc bằng một câu hỏi để tăng engagement`,

  'x_thread': `Yêu cầu:
Viết một X thread gồm 2-4 tweets liên tiếp.
Tweet 1: Hook để thu hút người đọc click vào thread
Tweet 2-3: Nội dung chính, mỗi tweet dưới 250 ký tự
Tweet cuối: Takeaway + CTA (follow, quote tweet, etc.)
Phân cách mỗi tweet bằng "---"
Có thể dùng emoji tự nhiên`,

  'instagram': `Yêu cầu:
Viết caption cho Instagram post.
Độ dài: 150-300 từ.
Bắt đầu bằng hook trong 2-3 dòng đầu (thu hút người đọc "keep reading")
Phần chính có giá trị (story, insight, hoặc value)
CTA ở cuối
8-15 hashtags (viết thường, cách nhau dấu cách)
Có thể dùng line breaks để dễ đọc`
}
