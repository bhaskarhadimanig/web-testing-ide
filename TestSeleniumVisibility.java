import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.Dimension;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import java.time.Duration;

public class TestSeleniumVisibility {
    private WebDriver driver;
    private WebDriverWait wait;

    @BeforeEach
    public void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--disable-web-security");
        options.addArguments("--disable-features=VizDisplayCompositor");
        options.addArguments("--remote-debugging-port=0");
        options.addArguments("--window-size=1280,720");
        options.addArguments("--start-maximized");
        options.addArguments("--disable-blink-features=AutomationControlled");
        options.addArguments("--disable-infobars");
        options.addArguments("--no-first-run");
        options.addArguments("--no-default-browser-check");
        options.addArguments("--disable-default-apps");
        options.addArguments("--disable-popup-blocking");
        options.addArguments("--disable-extensions-file-access-check");
        options.addArguments("--disable-extensions-http-throttling");
        options.addArguments("--keep-alive-for-test");
        options.addArguments("--disable-background-timer-throttling");
        options.addArguments("--disable-renderer-backgrounding");
        options.addArguments("--disable-backgrounding-occluded-windows");
        driver = new ChromeDriver(options);
        driver.manage().window().setSize(new Dimension(1280, 720));
        wait = new WebDriverWait(driver, Duration.ofSeconds(30));
    }

    @Test
    public void testBrowserVisibility() {
        System.out.println("Starting browser visibility test...");
        driver.get("https://bookcart.azurewebsites.net/");
        try { Thread.sleep(7000); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        System.out.println("Browser should be visible and staying open for extended time...");
        driver.get("https://bookcart.azurewebsites.net/login");
        try { Thread.sleep(7000); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        System.out.println("Test completed successfully - browser should have been visible throughout execution");
    }

    @AfterEach
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}
