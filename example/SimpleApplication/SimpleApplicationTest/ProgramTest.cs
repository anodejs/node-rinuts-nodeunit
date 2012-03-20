using SimpleApplication;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RemoteTest : System.Attribute { }

namespace SimpleApplicationTest
{
    
    
    /// <summary>
    ///This is a test class for ProgramTest and is intended
    ///to contain all ProgramTest Unit Tests
    ///</summary>
    [TestClass()]
    public class ProgramTest
    {


        private TestContext testContextInstance;

        /// <summary>
        ///Gets or sets the test context which provides
        ///information about and functionality for the current test run.
        ///</summary>
        public TestContext TestContext
        {
            get
            {
                return testContextInstance;
            }
            set
            {
                testContextInstance = value;
            }
        }

        #region Additional test attributes
        // 
        //You can use the following additional attributes as you write your tests:
        //
        //Use ClassInitialize to run code before running the first test in the class
        //[ClassInitialize()]
        //public static void MyClassInitialize(TestContext testContext)
        //{
        //}
        //
        //Use ClassCleanup to run code after all tests in a class have run
        //[ClassCleanup()]
        //public static void MyClassCleanup()
        //{
        //}
        //
        //Use TestInitialize to run code before running each test
        //[TestInitialize()]
        //public void MyTestInitialize()
        //{
        //}
        //
        //Use TestCleanup to run code after each test has run
        //[TestCleanup()]
        //public void MyTestCleanup()
        //{
        //}
        //
        #endregion


        /// <summary>
        ///A test for AddTwoNumbers
        ///</summary>
        [RemoteTest]
        [TestMethod()]
        public void AddTwoNumbersTest()
        {
            Program target = new Program(); // TODO: Initialize to an appropriate value
            int num1 = 0; // TODO: Initialize to an appropriate value
            int num2 = 1;
            int expected = 0; // TODO: Initialize to an appropriate value
            int actual;
            int.TryParse(Environment.GetEnvironmentVariable("rinutsnum2"), out num2);                
            actual = target.AddTwoNumbers(num1, num2);
            Assert.AreEqual(expected, actual);
        }

        /// <summary>
        ///A test for MultiplyTwoNumbers
        ///</summary>
        [TestMethod()]
        public void MultiplyTwoNumbersTest()
        {
            Program target = new Program(); // TODO: Initialize to an appropriate value
            int num1 = 0; // TODO: Initialize to an appropriate value
            int num2 = 0; // TODO: Initialize to an appropriate value
            int expected = 0; // TODO: Initialize to an appropriate value
            int actual;
            actual = target.MultiplyTwoNumbers(num1, num2);
            Assert.AreEqual(expected, actual);
        }
    }
}
