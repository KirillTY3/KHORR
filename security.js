(async function() {
    // --- ОБЩИЕ НАСТРОЙКИ БЛОКИРОВКИ ---

    // 1. Блокировка ТОЛЬКО по IP-адресу (независимо от видеокарты)
    // Добавьте сюда SHA-256 хеши IP-адресов, которые должны быть заблокированы всегда.
    const blockedIPsOnly = [
        'df73e497ae491c7543ab92f933ab368e528f30abc4e809ae582fb0dcf894aa11', 
    ]; 
    
    // 2. Блокировка по СОВПАДЕНИЮ IP-адреса И ВИДЕОКАРТЫ
    // Добавьте сюда объекты с парами { ip: 'хеш_адреса', gpu: 'название_видеокарты' }.
    // Блокировка сработает, только если ОБА параметра совпадут в одной записи.
    const blockedIPAndGPUCombinations = [
        { ip: 'f5686008630046522852575440d995c65f013da668d27038e24c489725514f08', gpu: 'NVIDIA GeForce RTX 3050' },
        { ip: '', gpu: '' },
    ];

    // Вспомогательная функция для генерации SHA-256 хеша
    async function sha256(message) {
        const msgUint8 = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async function checkAccess() {
        try {
            // Проверяем, не находимся ли мы уже на странице блокировки, чтобы избежать петли редиректов
            if (window.location.pathname.includes('blocked.html')) return;

            // 1. Получаем IP
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            const userIP = ipData.ip;
            
            // Хешируем полученный IP
            const hashedIP = await sha256(userIP);

            // 2. Получаем данные видеокарты
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            let renderer = "Unknown";
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                }
            }

            // Сначала проверяем блокировку по хешу IP
            if (blockedIPsOnly.includes(hashedIP)) {
                window.location.href = 'blocked.html';
                return; // Выходим, если IP заблокирован
            }

            // Затем проверяем блокировку по комбинации хеша IP и GPU
            const isCombinedBlocked = blockedIPAndGPUCombinations.some(entry =>
                entry.ip === hashedIP && renderer.includes(entry.gpu)
            );
            if (isCombinedBlocked) {
                window.location.href = 'blocked.html';
            }
        } catch (e) {
            console.warn('Security check failed, but proceeding...');
        }
    }
    checkAccess();
})();
