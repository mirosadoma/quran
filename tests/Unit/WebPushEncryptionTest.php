<?php

namespace Tests\Unit;

use App\Services\WebPush\WebPush;
use PHPUnit\Framework\TestCase;

class WebPushEncryptionTest extends TestCase
{
    /**
     * The example of RFC 8291, Appendix A: the same keys and salt give the same message.
     */
    public function test_messages_are_encrypted_as_in_rfc_8291(): void
    {
        $body = (new WebPush)->encrypt(
            WebPush::base64UrlDecode('V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24'),
            'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
            'BTBZMqHH6r4Tts7J_aSIgg',
            'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
            'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
            WebPush::base64UrlDecode('DGv6ra1nlYgDCS1FRnbzlw'),
        );

        // Header: salt, record size, key length and the sender's public key (86 bytes), then the record.
        $this->assertSame(
            'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
            WebPush::base64UrlEncode(substr($body, 0, 86)),
        );
        $this->assertSame(
            '8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ',
            WebPush::base64UrlEncode(substr($body, 86)),
        );
    }

    public function test_der_signatures_become_64_raw_bytes(): void
    {
        $r = str_repeat("\x11", 32);
        $s = "\x00".str_repeat("\x22", 31);
        // An integer with its high bit set gets a leading zero byte in DER.
        $highR = "\x80".str_repeat("\x01", 31);

        $der = "\x30\x44\x02\x20".$r."\x02\x20".$s;
        $this->assertSame($r.$s, WebPush::derToRawSignature($der));

        $der = "\x30\x45\x02\x21\x00".$highR."\x02\x20".$s;
        $this->assertSame($highR.$s, WebPush::derToRawSignature($der));
    }
}
