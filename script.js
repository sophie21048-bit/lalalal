// ================================
// ДОСТУПНЫЙ МАРШРУТ
// Исправленная версия script.js
// ================================

// Координаты городов
const cityCoordinates = {
    "Сочи": [43.5855, 39.7231],
    "Москва": [55.7558, 37.6173],
    "Казань": [55.7887, 49.1221],
    "Санкт-Петербург": [59.9343, 30.3351]
};

let map = null;
let multiRoute = null;


// ================================
// ИНИЦИАЛИЗАЦИЯ КАРТЫ
// ================================

function initMap() {
    if (typeof ymaps === "undefined") {
        console.error("Яндекс Карты API не загрузился.");

        showMessage(
            "Не удалось загрузить Яндекс Карты. Проверь API-ключ и подключение к интернету."
        );

        return;
    }

    const citySelect = document.getElementById("city");
    const selectedCity = citySelect ? citySelect.value : "Сочи";

    const center = cityCoordinates[selectedCity] || cityCoordinates["Сочи"];

    map = new ymaps.Map("map", {
        center: center,
        zoom: 12,
        controls: [
            "zoomControl",
            "fullscreenControl"
        ]
    });

    console.log("Карта успешно загружена.");
}


// ================================
// ПОДГОТОВКА АДРЕСА
// ================================

function prepareAddress(address, cityName) {
    address = address.trim();

    if (!address) {
        return "";
    }

    // Если пользователь уже указал город,
    // повторно его не добавляем.
    const cities = Object.keys(cityCoordinates);

    const hasCity = cities.some(city =>
        address.toLowerCase().includes(city.toLowerCase())
    );

    if (hasCity) {
        return address;
    }

    return `${cityName}, ${address}`;
}


// ================================
// ПОКАЗ СООБЩЕНИЯ
// ================================

function showMessage(message, type = "error") {
    console.log(message);

    // Возможные элементы для вывода результата
    const result =
        document.getElementById("result") ||
        document.querySelector(".result") ||
        document.querySelector(".route-result");

    if (result) {
        result.textContent = message;

        if (type === "success") {
            result.classList.add("success");
            result.classList.remove("error");
        } else {
            result.classList.add("error");
            result.classList.remove("success");
        }
    } else {
        // Если отдельного блока результата нет,
        // выводим сообщение в консоль.
        console.log(message);
    }
}


// ================================
// ПОЛУЧЕНИЕ КООРДИНАТ ПО АДРЕСУ
// ================================

async function geocodeAddress(address) {
    try {
        const result = await ymaps.geocode(address, {
            results: 1
        });

        if (!result || !result.geoObjects) {
            throw new Error("Геокодер не вернул результат.");
        }

        if (result.geoObjects.getLength() === 0) {
            throw new Error(`Адрес "${address}" не найден.`);
        }

        const firstObject = result.geoObjects.get(0);

        const coordinates = firstObject.geometry.getCoordinates();

        if (!coordinates || coordinates.length < 2) {
            throw new Error(`Не удалось получить координаты для "${address}".`);
        }

        let foundAddress = address;

        if (typeof firstObject.getAddressLine === "function") {
            foundAddress = firstObject.getAddressLine();
        }

        return {
            coordinates: coordinates,
            address: foundAddress
        };

    } catch (error) {
        console.error("Ошибка геокодирования:", error);

        throw new Error(
            `Не удалось найти адрес "${address}". Проверь правильность написания.`
        );
    }
}


// ================================
// УДАЛЕНИЕ ПРЕДЫДУЩЕГО МАРШРУТА
// ================================

function removePreviousRoute() {
    if (map && multiRoute) {
        try {
            map.geoObjects.remove(multiRoute);
        } catch (error) {
            console.warn("Не удалось удалить предыдущий маршрут:", error);
        }

        multiRoute = null;
    }
}


// ================================
// ПОСТРОЕНИЕ МАРШРУТА
// ================================

async function buildRoute(event) {
    if (event) {
        event.preventDefault();
    }

    // Проверяем API
    if (typeof ymaps === "undefined") {
        showMessage(
            "Яндекс Карты API не загрузился. Проверь API-ключ в index.html."
        );
        return;
    }

    if (!map) {
        showMessage(
            "Карта ещё не загрузилась. Подожди несколько секунд и попробуй снова."
        );
        return;
    }

    // Получаем элементы формы
    const fromInput = document.getElementById("fromInput");
    const toInput = document.getElementById("toInput");
    const citySelect = document.getElementById("citySelect");
    const userTypeSelect = document.getElementById("userType");
    const avoidStairsCheckbox = document.getElementById("avoidStairs");

    if (!fromInput || !toInput) {
        console.error("Не найдены поля from или to.");
        showMessage("Ошибка формы: не найдены поля адресов.");
        return;
    }

    const from = fromInput.value.trim();
    const to = toInput.value.trim();

    const city = citySelect
        ? citySelect.value
        : "Сочи";

    const userType = userTypeSelect
        ? userTypeSelect.value
        : "";

    const avoidStairs = avoidStairsCheckbox
        ? avoidStairsCheckbox.checked
        : false;

    // Проверка адресов
    if (!from) {
        showMessage("Введите адрес отправления.");
        fromInput.focus();
        return;
    }

    if (!to) {
        showMessage("Введите адрес назначения.");
        toInput.focus();
        return;
    }

    // Удаляем старый маршрут
    removePreviousRoute();

    showMessage("Ищу адреса и строю маршрут...", "success");

    const startAddress = prepareAddress(from, city);
    const endAddress = prepareAddress(to, city);

    console.log("Адрес отправления:", startAddress);
    console.log("Адрес назначения:", endAddress);

    try {
        // Сначала геокодируем оба адреса
        const start = await geocodeAddress(startAddress);
        const end = await geocodeAddress(endAddress);

        console.log("Координаты начала:", start.coordinates);
        console.log("Координаты конца:", end.coordinates);

        // Создаём пешеходный маршрут
        multiRoute = new ymaps.multiRouter.MultiRoute(
            {
                referencePoints: [
                    start.coordinates,
                    end.coordinates
                ],

                params: {
                    routingMode: "pedestrian",
                    results: 1
                }
            },
            {
                boundsAutoApply: true,

                // Оформление маршрута
                routeActiveStrokeWidth: 6,
                routeActiveStrokeColor: "#1976d2",

                routeStrokeWidth: 4,
                routeStrokeColor: "#1976d2"
            }
        );

        // Успешное построение
        multiRoute.model.events.add(
            "requestsuccess",
            function () {
                console.log("Маршрут успешно построен.");

                let message = "Маршрут успешно построен.";

                if (avoidStairs) {
                    message +=
                        " Учтено пожелание избежать лестниц, насколько это возможно.";
                }

                if (userType) {
                    message += ` Тип пользователя: ${userType}.`;
                }

                showMessage(message, "success");
            }
        );

        // Ошибка построения
        multiRoute.model.events.add(
            "requestfail",
            function (error) {
                console.error("Ошибка построения маршрута:", error);

                showMessage(
                    "Яндекс Карты не смогли построить пешеходный маршрут между этими адресами."
                );
            }
        );

        // Добавляем маршрут на карту
        map.geoObjects.add(multiRoute);

    } catch (error) {
        console.error("Ошибка:", error);

        showMessage(
            error.message ||
            "Произошла ошибка при построении маршрута."
        );
    }
}


// ================================
// ОБРАБОТКА ФОРМЫ
// ================================

function setupForm() {
    const form = document.querySelector("form");

    if (!form) {
        console.warn("Форма не найдена.");
        return;
    }

    form.addEventListener("submit", buildRoute);
}


// ================================
// ИЗМЕНЕНИЕ ГОРОДА
// ================================

function setupCityChange() {
    const citySelect = document.getElementById("citySelect");

    if (!citySelect) {
        return;
    }

    citySelect.addEventListener("change", function () {
        const city = citySelect.value;

        if (!map || !cityCoordinates[city]) {
            return;
        }

        // Перемещаем карту в выбранный город
        map.setCenter(
            cityCoordinates[city],
            12
        );

        // Убираем старый маршрут
        removePreviousRoute();
    });
}


// ================================
// ЗАПУСК
// ================================

function startApplication() {
    console.log("Запуск приложения...");

    initMap();
    setupForm();
    setupCityChange();
}


// Ждём загрузки API Яндекс Карт
if (typeof ymaps !== "undefined") {
    ymaps.ready(startApplication);
} else {
    console.error(
        "ymaps не найден. Проверь подключение API Яндекс Карт в index.html."
    );
}