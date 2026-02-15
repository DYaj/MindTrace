Feature: Practice Test Automation Login

  Scenario: Successful login
    Given I am on the login page
    When I login with username "student" and password "Password123"
    Then I should see the logged in success page
